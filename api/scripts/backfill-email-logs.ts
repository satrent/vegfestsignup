/**
 * One-time backfill script: Parse a Gmail Takeout .mbox file and create
 * AuditLog entries (action: SEND_EMAIL) for each email that can be matched
 * to a registration record.
 *
 * Usage:
 *   npx ts-node scripts/backfill-email-logs.ts /path/to/Sent.mbox
 *
 * Notes:
 *   - Skips verification code emails (subject contains "Verification Code")
 *   - Skips emails that can't be matched to a registration (deleted test records, etc.)
 *   - Safe to run multiple times — checks for duplicate entries before inserting
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import mongoose from 'mongoose';
import { config } from '../src/config';
import { Registration } from '../src/models/Registration';
import { AuditLog } from '../src/models/AuditLog';

// ── Types ─────────────────────────────────────────────────────────────────────

// Only import emails sent from this alias — everything else is ignored
const ALIAS_ADDRESS = 'tcvegfest.applications@exploreveg.org';

interface ParsedEmail {
    from: string;
    to: string;
    subject: string;
    date: Date | null;
    rawDate: string;
}

// ── mbox Parser ───────────────────────────────────────────────────────────────
// An mbox file is a sequence of RFC 2822 messages separated by "From " lines.
// We only need the To, Subject, and Date headers — no body parsing needed.

async function parseMbox(filePath: string): Promise<ParsedEmail[]> {
    const emails: ParsedEmail[] = [];
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf8' }),
        crlfDelay: Infinity,
    });

    let currentEmail: Partial<ParsedEmail> | null = null;
    let inHeaders = false;
    let lastHeader = '';

    for await (const line of rl) {
        // A new message starts with "From " at the beginning of a line
        if (line.startsWith('From ')) {
            // Only keep emails that came from the alias
            if (currentEmail?.from === ALIAS_ADDRESS && currentEmail?.to && currentEmail?.subject) {
                emails.push(currentEmail as ParsedEmail);
            }
            currentEmail = { from: '', to: '', subject: '', date: null, rawDate: '' };
            inHeaders = true;
            lastHeader = '';
            continue;
        }

        if (!inHeaders || !currentEmail) continue;

        // Blank line = end of headers, start of body — stop reading this message's headers
        if (line.trim() === '') {
            inHeaders = false;
            continue;
        }

        // Header folding: a line starting with whitespace is a continuation of the previous header
        if ((line.startsWith(' ') || line.startsWith('\t')) && lastHeader) {
            const value = line.trim();
            if (lastHeader === 'from') currentEmail.from += ' ' + value;
            if (lastHeader === 'to') currentEmail.to += ' ' + value;
            if (lastHeader === 'subject') currentEmail.subject += ' ' + value;
            if (lastHeader === 'date') currentEmail.rawDate += ' ' + value;
            continue;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        const headerName = line.slice(0, colonIdx).trim().toLowerCase();
        const headerValue = line.slice(colonIdx + 1).trim();

        if (headerName === 'from') {
            currentEmail.from = extractEmail(headerValue);
            lastHeader = 'from';
        } else if (headerName === 'to') {
            currentEmail.to = extractEmail(headerValue);
            lastHeader = 'to';
        } else if (headerName === 'subject') {
            currentEmail.subject = decodeSubject(headerValue);
            lastHeader = 'subject';
        } else if (headerName === 'date') {
            currentEmail.rawDate = headerValue;
            currentEmail.date = parseEmailDate(headerValue);
            lastHeader = 'date';
        } else {
            lastHeader = '';
        }
    }

    // Don't forget the last message
    if (currentEmail?.from === ALIAS_ADDRESS && currentEmail?.to && currentEmail?.subject) {
        emails.push(currentEmail as ParsedEmail);
    }

    return emails;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the bare email address from a "To" header value like "Name <addr@example.com>" */
function extractEmail(value: string): string {
    const match = value.match(/<([^>]+)>/);
    if (match) return match[1].trim().toLowerCase();
    return value.trim().toLowerCase();
}

/** Parse an RFC 2822 date string into a JS Date */
function parseEmailDate(value: string): Date | null {
    try {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
}

/**
 * Decode RFC 2047 encoded-word subjects like =?UTF-8?Q?Hello_World?=
 * Handles the common cases; for edge cases the raw string is returned.
 */
function decodeSubject(value: string): string {
    return value
        .replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_match, _charset, encoding, encoded) => {
            try {
                if (encoding.toUpperCase() === 'B') {
                    return Buffer.from(encoded, 'base64').toString('utf8');
                } else {
                    // Quoted-Printable
                    return encoded.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_m: string, hex: string) =>
                        String.fromCharCode(parseInt(hex, 16))
                    );
                }
            } catch {
                return encoded;
            }
        })
        .trim();
}

// ── Subjects to skip ──────────────────────────────────────────────────────────

const SKIP_SUBJECTS = [
    'verification code',
    'verify your email',
];

function shouldSkip(subject: string): boolean {
    const lower = subject.toLowerCase();
    return SKIP_SUBJECTS.some(s => lower.includes(s));
}

// ── Main ──────────────────────────────────────────────────────────────────────

const run = async () => {
    const mboxPath = process.argv[2];

    if (!mboxPath) {
        console.error('Usage: npx ts-node scripts/backfill-email-logs.ts /path/to/Sent.mbox');
        process.exit(1);
    }

    if (!fs.existsSync(mboxPath)) {
        console.error(`File not found: ${mboxPath}`);
        process.exit(1);
    }

    console.log(`Connecting to database...`);
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected.\n');

    console.log(`Parsing: ${path.basename(mboxPath)}`);
    const allEmails = await parseMbox(mboxPath);
    console.log(`Found ${allEmails.length} emails from ${ALIAS_ADDRESS} (personal emails already excluded).\n`);

    // Filter out verification codes and other skipped subjects
    const relevant = allEmails.filter(e => !shouldSkip(e.subject));
    console.log(`After filtering skipped subjects: ${relevant.length} emails to process.\n`);

    let matched = 0;
    let noRegistration = 0;
    let duplicate = 0;
    let inserted = 0;

    for (const email of relevant) {
        if (!email.to || !email.subject) continue;

        // Find a registration with this email address
        const registration = await Registration.findOne({ email: email.to }).select('_id email').lean();

        if (!registration) {
            noRegistration++;
            continue;
        }

        matched++;

        // Check for duplicate — same registration, same subject, same date (within 1 min)
        const timestamp = email.date || new Date();
        const oneMinute = 60 * 1000;
        const existing = await AuditLog.findOne({
            entityId: registration._id,
            action: 'SEND_EMAIL',
            target: email.subject,
            timestamp: {
                $gte: new Date(timestamp.getTime() - oneMinute),
                $lte: new Date(timestamp.getTime() + oneMinute),
            },
        });

        if (existing) {
            duplicate++;
            continue;
        }

        // Create the audit log entry
        await AuditLog.create({
            actorName: 'System',
            entityId: registration._id,
            entityType: 'Registration',
            action: 'SEND_EMAIL',
            target: email.subject,
            details: `Historical email (imported from Gmail). Sent to ${email.to}`,
            timestamp,
        });

        inserted++;
        console.log(`  ✓ [${timestamp.toLocaleDateString()}] "${email.subject}" → ${email.to}`);
    }

    console.log('\n── Summary ──────────────────────────');
    console.log(`  From alias (matched sender):  ${allEmails.length}`);
    console.log(`  Skipped (verification):       ${allEmails.length - relevant.length}`);
    console.log(`  Matched to registration:  ${matched}`);
    console.log(`  No registration found:    ${noRegistration} (expected for deleted test records)`);
    console.log(`  Duplicates skipped:       ${duplicate}`);
    console.log(`  Audit log entries created: ${inserted}`);
    console.log('─────────────────────────────────────\n');

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
};

run().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
