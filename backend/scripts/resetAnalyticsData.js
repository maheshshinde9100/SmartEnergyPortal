import 'dotenv/config';
import mongoose from 'mongoose';
import Consumption from '../models/Consumption.js';
import connectDB from '../config/database.js';

/**
 * Resets analytics-driving data to zero by deleting all Consumption records.
 * This keeps Users/Appliances intact, so new customers can sign up normally.
 */

const run = async () => {
  try {
    await connectDB();

    const result = await Consumption.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} consumption record(s).`);
  } catch (err) {
    console.error('❌ Failed to reset analytics data:', err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch {
      // ignore
    }
  }
};

run();

