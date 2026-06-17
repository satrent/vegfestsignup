/**
 * One-time migration: mark all existing Logo, Coupon Logo, and product-photo
 * documents as 'Approved'. These types are auto-approved on upload going
 * forward (see upload.routes.ts); this backfills records uploaded before that
 * change so none are left stuck in 'Pending'/'Rejected'.
 *
 * Usage:
 *   npx ts-node scripts/approve-existing-logos-photos.ts
 *
 * Notes:
 *   - Only touches entries in the `documents` array of these three types.
 *   - Logos/photos stored in logoUrl/couponLogoUrl/productPhotos fields are
 *     unaffected (they already display as Approved).
 *   - Safe to run multiple times — already-Approved entries are skipped.
 */

import mongoose from 'mongoose';
import { config } from '../src/config';
import { Registration } from '../src/models/Registration';

const AUTO_APPROVED_TYPES = ['Logo', 'Coupon Logo', 'product-photo'];

async function run(): Promise<void> {
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB.');

    const match = {
        documents: {
            $elemMatch: {
                type: { $in: AUTO_APPROVED_TYPES },
                status: { $ne: 'Approved' },
            },
        },
    };

    const registrationsToFix = await Registration.countDocuments(match);
    console.log(`Registrations with non-approved logo/photo documents: ${registrationsToFix}`);

    if (registrationsToFix === 0) {
        console.log('Nothing to update.');
        await mongoose.disconnect();
        return;
    }

    const result = await Registration.updateMany(match, {
        $set: { 'documents.$[el].status': 'Approved' },
    }, {
        arrayFilters: [
            { 'el.type': { $in: AUTO_APPROVED_TYPES }, 'el.status': { $ne: 'Approved' } },
        ],
    });

    console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount} registration(s).`);

    const remaining = await Registration.countDocuments(match);
    console.log(`Remaining non-approved logo/photo documents: ${remaining}`);

    await mongoose.disconnect();
    console.log('Done.');
}

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
