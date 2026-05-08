import mongoose from 'mongoose';
import Appliance from '../models/Appliance.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
    const app = await Appliance.findOne({name: /Cooler/i});
    if (app) {
      console.log('Appliance:', app.name);
      console.log('isCustom type:', typeof app.isCustom);
      console.log('isCustom value:', app.isCustom);
      console.log('isActive type:', typeof app.isActive);
      console.log('isActive value:', app.isActive);
    } else {
      console.log('No cooler found');
    }
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
