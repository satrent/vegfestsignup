// MongoDB script to migrate existing admins to Super Admin role
// Run this with: mongosh vegfest < migrate-super-admins.js

db = db.getSiblingDB('vegfest');

// Find all users with role 'ADMIN' or 'WEB_ADMIN'
// and set isSuperAdmin = true
const result = db.users.updateMany(
    {
        role: { $in: ['ADMIN', 'WEB_ADMIN'] }
    },
    {
        $set: {
            isSuperAdmin: true,
            isApprover: true // Also giving them Approver role as "everyone is an admin" implies full power initially
        }
    }
);

print('Migration complete.');
print('Matched count: ' + result.matchedCount);
print('Modified count: ' + result.modifiedCount);
