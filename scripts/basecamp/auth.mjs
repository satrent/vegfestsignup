// One-time Basecamp OAuth 2 authorization.
//
// Usage:
//   1. cd scripts/basecamp
//   2. cp .env.example .env  and fill in BASECAMP_CLIENT_ID / _SECRET
//   3. node auth.mjs
//
// It opens the Basecamp consent page, catches the redirect on the local
// server, exchanges the code for tokens, and writes them back into .env.
// No external dependencies — Node built-ins only.

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exec } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(HERE, '.env');

// --- tiny .env parser / updater (no dotenv dependency) ---
function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    console.error(`Missing ${ENV_PATH}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function saveEnv(updates) {
  let lines = readFileSync(ENV_PATH, 'utf8').split('\n');
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_PATH, lines.join('\n'));
}

function post(url, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const u = new URL(url);
    const req = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(data));
          else reject(new Error(`${res.statusCode}: ${data}`));
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const env = loadEnv();
const { BASECAMP_CLIENT_ID, BASECAMP_CLIENT_SECRET, BASECAMP_REDIRECT_URI } = env;

if (!BASECAMP_CLIENT_ID || !BASECAMP_CLIENT_SECRET) {
  console.error('Set BASECAMP_CLIENT_ID and BASECAMP_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const redirect = new URL(BASECAMP_REDIRECT_URI);
const port = redirect.port || 80;

const authUrl =
  'https://launchpad.37signals.com/authorization/new?' +
  new URLSearchParams({
    type: 'web_server',
    client_id: BASECAMP_CLIENT_ID,
    redirect_uri: BASECAMP_REDIRECT_URI,
  }).toString();

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${port}`);
  if (reqUrl.pathname !== redirect.pathname) {
    res.writeHead(404).end();
    return;
  }
  const code = reqUrl.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('No code in redirect.');
    return;
  }
  try {
    const token = await post('https://launchpad.37signals.com/authorization/token', {
      type: 'web_server',
      client_id: BASECAMP_CLIENT_ID,
      client_secret: BASECAMP_CLIENT_SECRET,
      redirect_uri: BASECAMP_REDIRECT_URI,
      code,
    });
    const expiresAt = Date.now() + (token.expires_in ?? 1209600) * 1000;
    saveEnv({
      BASECAMP_ACCESS_TOKEN: token.access_token,
      BASECAMP_REFRESH_TOKEN: token.refresh_token ?? '',
      BASECAMP_TOKEN_EXPIRES_AT: String(expiresAt),
    });
    res.writeHead(200, { 'Content-Type': 'text/html' }).end(
      '<h2>Authorized. Tokens saved to .env. You can close this tab.</h2>'
    );
    console.log('\n✅ Access token saved to .env');
    console.log(`   Expires: ${new Date(expiresAt).toISOString()}`);
    server.close();
  } catch (err) {
    res.writeHead(500).end(String(err));
    console.error(err);
    server.close();
  }
});

server.listen(port, () => {
  console.log(`Listening on ${BASECAMP_REDIRECT_URI}`);
  console.log('Opening browser to authorize...\n' + authUrl + '\n');
  const cmd =
    process.platform === 'win32' ? `start "" "${authUrl}"`
    : process.platform === 'darwin' ? `open "${authUrl}"`
    : `xdg-open "${authUrl}"`;
  exec(cmd, (e) => {
    if (e) console.log('Could not auto-open. Paste the URL above into your browser.');
  });
});
