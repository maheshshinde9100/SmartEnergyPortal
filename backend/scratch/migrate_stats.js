import mongoose from 'mongoose';
import User from '../models/User.js';
import { updateUserStatistics } from '../utils/statsUpdater.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
    console.log('📡 Connected to database for statistics migration');

    const users = await User.find({ role: 'user' });
    console.log(`🔍 Found ${users.length} users to update`);

    for (const user of users) {
      console.log(`🔄 Updating stats for ${user.email}...`);
      await updateUserStatistics(user._id);
    }

    console.log('✅ Migration completed successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
