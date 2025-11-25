// MongoDB script to create an admin user
// Run this with: mongosh vegfest < create-admin.js

db = db.getSiblingDB('vegfest');

// Create admin user
const adminUser = {
    email: 'trent.nelson@exploreveg.com',
    firstName: 'Trent',
    lastName: 'Nelson',
    role: 'WEB_ADMIN',
    emailVerified: true,
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
};

// Check if user already exists
const existingUser = db.users.findOne({ email: adminUser.email });

if (existingUser) {
    // Update existing user to WEB_ADMIN
    db.users.updateOne(
        { email: adminUser.email },
        {
            $set: {
                role: 'WEB_ADMIN',
                emailVerified: true,
                isActive: true,
                updatedAt: new Date()
            }
        }
    );
    print('✅ Updated existing user to WEB_ADMIN role');
    print('Email: ' + adminUser.email);
} else {
    // Create new user
    db.users.insertOne(adminUser);
    print('✅ Created new WEB_ADMIN user');
    print('Email: ' + adminUser.email);
}

// Display the user
const user = db.users.findOne({ email: adminUser.email });
print('\nUser details:');
printjson(user);
