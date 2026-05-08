import mongoose from 'mongoose';
import Appliance from '../models/Appliance.js';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    
    console.log('Connecting to:', uri.split('@')[1]); // Don't log credentials
    console.log('Database:', dbName);
    
    await mongoose.connect(uri, { dbName });
    
    const totalUsers = await User.countDocuments({ role: 'user' });
    console.log('Total users:', totalUsers);
    
    const apps = await Appliance.find({isCustom: true});
    console.log('Total custom appliances:', apps.length);
    
    if (apps.length > 0) {
      const stats = apps.map(a => ({
        name: a.name, 
        w: a.defaultWattage, 
        h: a.usageHints?.estimatedDailyHours,
        createdBy: a.createdBy
      }));
      console.log(JSON.stringify(stats.slice(0, 5), null, 2));
      
      const totalProjected = stats.reduce((sum, a) => {
        const h = (a.h === undefined || a.h === null || a.h === 0) ? 4 : a.h;
        return sum + (a.w * h * 30) / 1000;
      }, 0);
      console.log('Calculated Total Monthly Projected:', totalProjected, 'kWh');
    }
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
