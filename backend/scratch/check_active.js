import mongoose from 'mongoose';
import Appliance from '../models/Appliance.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
    const apps = await Appliance.find({isCustom: true});
    console.log('Total custom appliances:', apps.length);
    console.log('Active count:', apps.filter(a => a.isActive).length);
    console.log('Inactive count:', apps.filter(a => !a.isActive).length);
    
    if (apps.length > 0) {
      console.log('First app isActive:', apps[0].isActive);
    }
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
