import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
    const user = await User.findOne({email: 'uthete16@gmail.com'});
    if (user) {
      console.log('User:', user.email);
      console.log('Statistics:', JSON.stringify(user.statistics, null, 2));
    } else {
      console.log('User not found');
    }
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
