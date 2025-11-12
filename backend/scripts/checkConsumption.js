import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Consumption from '../models/Consumption.js';

dotenv.config();

const checkConsumption = async () => {
  try {
    console.log('📊 Checking consumption data...\n');

    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;
    
    await mongoose.connect(fullURI);
    console.log('✅ Connected to MongoDB\n');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    console.log(`Current Date: ${currentMonth}/${currentYear}\n`);

    // Get all consumption records
    const allConsumption = await Consumption.find({}).sort({ year: -1, month: -1 });
    console.log(`Total consumption records: ${allConsumption.length}\n`);

    if (allConsumption.length > 0) {
      console.log('Recent consumption records:');
      allConsumption.slice(0, 10).forEach(record => {
        console.log(`  ${record.month}/${record.year}: ${record.totalUnits} kWh, ₹${record.estimatedBill}`);
      });
    }

    // Get current month consumption
    const currentMonthData = await Consumption.find({ month: currentMonth, year: currentYear });
    console.log(`\nCurrent month (${currentMonth}/${currentYear}) records: ${currentMonthData.length}`);
    
    if (currentMonthData.length > 0) {
      const total = currentMonthData.reduce((sum, r) => sum + r.totalUnits, 0);
      const totalBill = currentMonthData.reduce((sum, r) => sum + r.estimatedBill, 0);
      console.log(`Total consumption: ${total} kWh`);
      console.log(`Total revenue: ₹${totalBill}`);
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkConsumption();
