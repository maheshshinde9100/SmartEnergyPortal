import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const listUsers = async () => {
    try {
        console.log('📋 Listing all users...\n');

        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI;
        const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
        const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;

        await mongoose.connect(fullURI);
        console.log('✅ Connected to MongoDB\n');

        // Get all users
        const users = await User.find({}).select('_id email role profile.firstName profile.lastName isActive createdAt');

        console.log(`Found ${users.length} users:\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.role.toUpperCase()}`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.profile.firstName} ${user.profile.lastName}`);
            console.log(`   Status: ${user.isActive ? '✅ Active' : '❌ Inactive'}`);
            console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

listUsers();
