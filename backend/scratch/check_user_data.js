import mongoose from 'mongoose';
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
    
    const user = await User.findOne({'profile.firstName': /Krushhna/i});
    if (!user) {
      console.log('User not found');
      process.exit();
    }
    
    console.log('User ID:', user._id);
    
    const customApps = await Appliance.find({ createdBy: user._id, isCustom: true });
    console.log('Custom appliances count:', customApps.length);
    customApps.forEach(a => console.log(`- ${a.name} (${a.defaultWattage}W, isCustom: ${a.isCustom})`));
    
    const allApps = await Appliance.find({ createdBy: user._id });
    console.log('All appliances for user:', allApps.length);
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
