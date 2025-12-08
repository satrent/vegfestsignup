// Seed Initial Admin Users
// Run this script manually in MongoDB Atlas to create your first admin users before deploying

db.users.insertMany([
    {
        email: "your-admin-email@example.com",  // CHANGE THIS
        firstName: "Your",
        lastName: "Name",
        role: "ADMIN",
        emailVerified: false,
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: "second-admin@example.com",  // CHANGE THIS
        firstName: "Second",
        lastName: "Admin",
        role: "ADMIN",
        emailVerified: false,
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        email: "third-admin@example.com",  // CHANGE THIS
        firstName: "Third",
        lastName: "Admin",
        role: "ADMIN",
        emailVerified: false,
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    }
]);
