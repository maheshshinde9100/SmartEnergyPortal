import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import Consumption from '../models/Consumption.js';

dotenv.config();

const addConsumption = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;
    
    await mongoose.connect(fullURI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ email: 'test@mahesh.com' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('👤 User:', user.email);
    console.log('🆔 ID:', user._id, '\n');

    const appliances = await Appliance.find({ createdBy: user._id });
    console.log(`📦 Found ${appliances.length} appliance(s)\n`);

    if (appliances.length === 0) {
      console.log('❌ No appliances found for user');
      process.exit(1);
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Check if consumption already exists
    const existing = await Consumption.findOne({ 
      userId: user._id, 
      month: currentMonth, 
      year: currentYear 
    });

    if (existing) {
      console.log(`⚠️  Consumption already exists for ${currentMonth}/${currentYear}`);
      console.log(`   Total Units: ${existing.totalUnits} kWh`);
      console.log(`   Estimated Bill: ₹${existing.estimatedBill}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create consumption data
    const applianceUsage = appliances.map(appliance => {
      // Use realistic usage: 8 hours per day for the appliance
      const dailyHours = 8;
      const quantity = 1;
      
      return {
        applianceId: appliance._id,
        quantity: quantity,
        dailyHours: dailyHours,
        customWattage: null
      };
    });

    // Calculate total consumption
    let totalUnits = 0;
    appliances.forEach((appliance, index) => {
      const usage = applianceUsage[index];
      const wattage = appliance.defaultWattage;
      const dailyConsumption = (wattage * usage.dailyHours) / 1000; // kWh per day
      const monthlyConsumption = dailyConsumption * 30; // 30 days
      const totalApplianceConsumption = monthlyConsumption * usage.quantity;
      totalUnits += totalApplianceConsumption;
      
      console.log(`📊 ${appliance.name}:`);
      console.log(`   Wattage: ${wattage}W`);
      console.log(`   Daily Hours: ${usage.dailyHours}h`);
      console.log(`   Monthly Consumption: ${monthlyConsumption.toFixed(2)} kWh\n`);
    });

    // Calculate bill using MSEB tariff
    const slabs = [
      { min: 0, max: 100, rate: 3.5 },
      { min: 101, max: 300, rate: 4.5 },
      { min: 301, max: 500, rate: 6.0 },
      { min: 501, max: Infinity, rate: 7.5 }
    ];

    let estimatedBill = 0;
    let remainingUnits = totalUnits;
    for (const slab of slabs) {
      if (remainingUnits <= 0) break;
      const slabUnits = Math.min(remainingUnits, slab.max - slab.min + 1);
      estimatedBill += slabUnits * slab.rate;
      remainingUnits -= slabUnits;
    }

    // Create consumption record
    const consumption = new Consumption({
      userId: user._id,
      month: currentMonth,
      year: currentYear,
      appliances: applianceUsage,
      totalUnits: Math.round(totalUnits * 100) / 100,
      estimatedBill: Math.round(estimatedBill * 100) / 100
    });

    await consumption.save();

    console.log('✅ Consumption data added successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Period: ${currentMonth}/${currentYear}`);
    console.log(`⚡ Total Consumption: ${consumption.totalUnits} kWh`);
    console.log(`💰 Estimated Bill: ₹${consumption.estimatedBill}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

addConsumption();
