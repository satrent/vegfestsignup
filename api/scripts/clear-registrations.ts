
import mongoose from 'mongoose';
import { config } from '../src/config'; // Adjust path as needed
import { Registration } from '../src/models/Registration'; // Adjust path as needed

const clearRegistrations = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(config.mongodb.uri);
        console.log('Connected to database.');

        console.log('Clearing registrations...');
        const result = await Registration.deleteMany({});
        console.log(`Deleted ${result.deletedCount} registrations.`);

        await mongoose.disconnect();
        console.log('Disconnected from database.');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing registrations:', error);
        process.exit(1);
    }
};

clearRegistrations();
