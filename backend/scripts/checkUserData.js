import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import Consumption from '../models/Consumption.js';

dotenv.config();

const checkUserData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;
    
    await mongoose.connect(fullURI);

    const user = await User.findOne({ email: 'test@mahesh.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('User:', user.email);
    console.log('ID:', user._id);

    const appliances = await Appliance.find({ createdBy: user._id });
    console.log('\nAppliances:', appliances.length);
    appliances.forEach(app => {
      console.log(`  - ${app.name} (${app.defaultWattage}W)`);
    });

    const consumption = await Consumption.find({ userId: user._id });
    console.log('\nConsumption records:', consumption.length);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkUserData();
