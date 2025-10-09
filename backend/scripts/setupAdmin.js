import mongoose from 'mongoose';
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import TariffRate from '../models/TariffRate.js';
import Consumption from '../models/Consumption.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const setupAdmin = async () => {
  try {
    console.log('🚀 Starting Admin Setup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-energy-portal');
    console.log('📦 Connected to MongoDB');

    // 1. Clean up existing admin users
    console.log('\n🧹 Cleaning up existing admin users...');
    await User.deleteMany({ role: 'admin' });
    console.log('✅ Removed existing admin users');

    // 2. Create fresh admin user
    console.log('\n👤 Creating admin user...');
    
    const adminUser = new User({
      msebCustomerId: 'ADMIN001',
      email: 'admin@portal.com',
      mobile: '9999999999',
      password: 'Admin@123', // Let the model hash it
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        address: {
          village: 'Admin Office',
          city: 'Mumbai',
          pincode: '400001',
          state: 'Maharashtra'
        }
      },
      role: 'admin',
      isVerified: true,
      emailVerified: true,
      mobileVerified: true,
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@portal.com');
    console.log('🔑 Password: Admin@123');

    // 3. Test admin login
    console.log('\n🔐 Testing admin login...');
    const testUser = await User.findOne({ email: 'admin@portal.com' }).select('+password');
    if (testUser) {
      const isPasswordValid = await testUser.comparePassword('Admin@123');
      if (isPasswordValid) {
        console.log('✅ Admin login test successful');
      } else {
        console.log('❌ Admin login test failed - password mismatch');
      }
    }

    // 4. Ensure default appliances exist
    console.log('\n🔧 Checking default appliances...');
    const applianceCount = await Appliance.countDocuments({ isCustom: false });
    if (applianceCount === 0) {
      const defaultAppliances = [
        { name: 'LED Bulb (9W)', category: 'Lighting', defaultWattage: 9, isCustom: false },
        { name: 'CFL Bulb (15W)', category: 'Lighting', defaultWattage: 15, isCustom: false },
        { name: 'Tube Light (40W)', category: 'Lighting', defaultWattage: 40, isCustom: false },
        { name: 'Ceiling Fan', category: 'Cooling', defaultWattage: 75, isCustom: false },
        { name: 'Table Fan', category: 'Cooling', defaultWattage: 50, isCustom: false },
        { name: 'Air Conditioner (1.5 Ton)', category: 'Cooling', defaultWattage: 1500, isCustom: false },
        { name: 'Air Conditioner (1 Ton)', category: 'Cooling', defaultWattage: 1000, isCustom: false },
        { name: 'Refrigerator (Single Door)', category: 'Kitchen', defaultWattage: 150, isCustom: false },
        { name: 'Refrigerator (Double Door)', category: 'Kitchen', defaultWattage: 250, isCustom: false },
        { name: 'Microwave Oven', category: 'Kitchen', defaultWattage: 1000, isCustom: false },
        { name: 'Washing Machine', category: 'Laundry', defaultWattage: 500, isCustom: false },
        { name: 'Television (LED 32")', category: 'Entertainment', defaultWattage: 60, isCustom: false },
        { name: 'Television (LED 55")', category: 'Entertainment', defaultWattage: 150, isCustom: false },
        { name: 'Desktop Computer', category: 'Office', defaultWattage: 300, isCustom: false },
        { name: 'Laptop', category: 'Office', defaultWattage: 65, isCustom: false },
        { name: 'Water Heater (Geyser)', category: 'Heating', defaultWattage: 2000, isCustom: false }
      ];
      
      await Appliance.insertMany(defaultAppliances);
      console.log('✅ Default appliances created');
    } else {
      console.log('ℹ️  Default appliances already exist');
    }

    // 5. Ensure tariff rates exist
    console.log('\n💰 Checking tariff rates...');
    const tariffCount = await TariffRate.countDocuments();
    if (tariffCount === 0) {
      const defaultTariff = new TariffRate({
        slabs: [
          { minUnits: 0, maxUnits: 100, ratePerUnit: 3.5 },
          { minUnits: 101, maxUnits: 300, ratePerUnit: 4.5 },
          { minUnits: 301, maxUnits: 500, ratePerUnit: 6.0 },
          { minUnits: 501, maxUnits: 999999, ratePerUnit: 7.5 }
        ],
        effectiveFrom: new Date(),
        createdBy: adminUser._id,
        isActive: true,
        description: 'Default MSEB tariff structure for residential consumers'
      });
      
      await defaultTariff.save();
      console.log('✅ Default tariff rates created');
    } else {
      console.log('ℹ️  Tariff rates already exist');
    }

    // 6. Create sample users for testing
    console.log('\n👥 Creating sample users...');
    const sampleUsers = [
      {
        msebCustomerId: 'MSEB001234',
        email: 'user1@example.com',
        mobile: '9876543210',
        password: 'user123',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          address: {
            village: 'Sample Village',
            city: 'Pune',
            pincode: '411001',
            state: 'Maharashtra'
          }
        },
        role: 'user',
        isVerified: true,
        emailVerified: true,
        mobileVerified: true,
        isActive: true
      },
      {
        msebCustomerId: 'MSEB001235',
        email: 'user2@example.com',
        mobile: '9876543211',
        password: 'user123',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          address: {
            village: 'Test Village',
            city: 'Mumbai',
            pincode: '400001',
            state: 'Maharashtra'
          }
        },
        role: 'user',
        isVerified: true,
        emailVerified: true,
        mobileVerified: true,
        isActive: true
      }
    ];

    // Remove existing sample users first
    await User.deleteMany({ 
      $or: [
        { email: { $in: ['user1@example.com', 'user2@example.com'] } },
        { mobile: { $in: ['9876543210', '9876543211'] } }
      ]
    });
    
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
    }
    console.log('✅ Sample users created (user1@example.com, user2@example.com - password: user123)');

    // 7. Create sample consumption data
    console.log('\n📊 Creating sample consumption data...');
    const users = await User.find({ role: 'user' });
    const appliances = await Appliance.find({ isCustom: false }).limit(5);
    
    if (users.length > 0 && appliances.length > 0) {
      for (const user of users) {
        // Create consumption for last 3 months
        for (let i = 0; i < 3; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          
          const consumptionAppliances = appliances.slice(0, 3).map(app => ({
            applianceId: app._id,
            quantity: Math.floor(Math.random() * 3) + 1,
            dailyHours: Math.floor(Math.random() * 8) + 2,
            customWattage: null
          }));
          
          // Calculate total units
          let totalUnits = 0;
          for (const appUsage of consumptionAppliances) {
            const appliance = appliances.find(a => a._id.equals(appUsage.applianceId));
            const dailyConsumption = (appliance.defaultWattage * appUsage.dailyHours) / 1000;
            const monthlyConsumption = dailyConsumption * 30;
            totalUnits += monthlyConsumption * appUsage.quantity;
          }
          
          // Calculate bill (simplified)
          const estimatedBill = totalUnits * 5; // Simplified calculation
          
          const consumption = new Consumption({
            userId: user._id,
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            appliances: consumptionAppliances,
            totalUnits: Math.round(totalUnits * 100) / 100,
            estimatedBill: Math.round(estimatedBill * 100) / 100
          });
          
          try {
            await consumption.save();
          } catch (error) {
            // Skip if already exists
            if (error.code !== 11000) {
              console.error('Error creating consumption:', error);
            }
          }
        }
      }
      console.log('✅ Sample consumption data created');
    }

    // 8. Final verification
    console.log('\n🔍 Final verification...');
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount = await User.countDocuments({ role: 'user' });
    const applianceCount2 = await Appliance.countDocuments();
    const consumptionCount = await Consumption.countDocuments();
    
    console.log(`👤 Admin users: ${adminCount}`);
    console.log(`👥 Regular users: ${userCount}`);
    console.log(`🔧 Appliances: ${applianceCount2}`);
    console.log(`📊 Consumption records: ${consumptionCount}`);

    await mongoose.disconnect();
    console.log('\n🎉 Admin setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('🔐 Admin: admin@portal.com / Admin@123');
    console.log('👤 User1: user1@example.com / user123');
    console.log('👤 User2: user2@example.com / user123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
};

setupAdmin();