import mongoose from 'mongoose';
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import TariffRate from '../models/TariffRate.js';
import Consumption from '../models/Consumption.js';
import dotenv from 'dotenv';

dotenv.config();

const completeSetup = async () => {
  try {
    console.log('🚀 Starting Complete Setup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-energy-portal');
    console.log('📦 Connected to MongoDB');

    // 1. Verify admin user exists and works
    console.log('\n🔍 Verifying admin user...');
    let admin = await User.findOne({ email: 'admin@portal.com' }).select('+password');
    if (!admin) {
      console.log('👤 Creating admin user...');
      admin = new User({
        msebCustomerId: 'ADMIN001',
        email: 'admin@portal.com',
        mobile: '9999999999',
        password: 'Admin@123',
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
      await admin.save();
      console.log('✅ Admin user created');
    }
    
    const isAdminValid = await admin.comparePassword('Admin@123');
    console.log(`🔐 Admin login test: ${isAdminValid ? '✅ Success' : '❌ Failed'}`);

    // 2. Create sample users with proper passwords
    console.log('\n👥 Creating sample users...');
    const sampleUsers = [
      {
        msebCustomerId: 'MSEB001234',
        email: 'user1@example.com',
        mobile: '9876543210',
        password: 'User@123',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          address: {
            village: 'Sample Village',
            city: 'Pune',
            pincode: '411001',
            state: 'Maharashtra'
          }
        }
      },
      {
        msebCustomerId: 'MSEB001235',
        email: 'user2@example.com',
        mobile: '9876543211',
        password: 'User@123',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          address: {
            village: 'Test Village',
            city: 'Mumbai',
            pincode: '400001',
            state: 'Maharashtra'
          }
        }
      }
    ];

    for (const userData of sampleUsers) {
      // Remove existing user if exists
      await User.deleteOne({ email: userData.email });
      await User.deleteOne({ mobile: userData.mobile });
      await User.deleteOne({ msebCustomerId: userData.msebCustomerId });
      
      const user = new User({
        ...userData,
        role: 'user',
        isVerified: true,
        emailVerified: true,
        mobileVerified: true,
        isActive: true
      });
      
      await user.save();
      console.log(`✅ Created user: ${userData.email}`);
      
      // Test password
      const testUser = await User.findOne({ email: userData.email }).select('+password');
      const isValid = await testUser.comparePassword('User@123');
      console.log(`🔐 Password test for ${userData.email}: ${isValid ? '✅ Success' : '❌ Failed'}`);
    }

    // 3. Create sample consumption data
    console.log('\n📊 Creating sample consumption data...');
    const users = await User.find({ role: 'user' });
    const appliances = await Appliance.find({ isCustom: false }).limit(5);
    
    if (users.length > 0 && appliances.length > 0) {
      for (const user of users) {
        // Remove existing consumption data
        await Consumption.deleteMany({ userId: user._id });
        
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
          const estimatedBill = totalUnits * 5.5; // Average rate
          
          const consumption = new Consumption({
            userId: user._id,
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            appliances: consumptionAppliances,
            totalUnits: Math.round(totalUnits * 100) / 100,
            estimatedBill: Math.round(estimatedBill * 100) / 100
          });
          
          await consumption.save();
        }
        console.log(`✅ Created consumption data for ${user.email}`);
      }
    }

    // 4. Final verification
    console.log('\n🔍 Final verification...');
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount = await User.countDocuments({ role: 'user' });
    const applianceCount = await Appliance.countDocuments();
    const consumptionCount = await Consumption.countDocuments();
    const tariffCount = await TariffRate.countDocuments();
    
    console.log(`👤 Admin users: ${adminCount}`);
    console.log(`👥 Regular users: ${userCount}`);
    console.log(`🔧 Appliances: ${applianceCount}`);
    console.log(`📊 Consumption records: ${consumptionCount}`);
    console.log(`💰 Tariff rates: ${tariffCount}`);

    // 5. Test all logins
    console.log('\n🔐 Testing all login credentials...');
    const testCredentials = [
      { email: 'admin@portal.com', password: 'Admin@123', role: 'admin' },
      { email: 'user1@example.com', password: 'User@123', role: 'user' },
      { email: 'user2@example.com', password: 'User@123', role: 'user' }
    ];

    for (const cred of testCredentials) {
      const user = await User.findOne({ email: cred.email }).select('+password');
      if (user) {
        const isValid = await user.comparePassword(cred.password);
        console.log(`${cred.role === 'admin' ? '🔐' : '👤'} ${cred.email}: ${isValid ? '✅ Success' : '❌ Failed'}`);
      } else {
        console.log(`❌ User not found: ${cred.email}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n🎉 Complete setup finished successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('🔐 Admin: admin@portal.com / Admin@123');
    console.log('👤 User1: user1@example.com / User@123');
    console.log('👤 User2: user2@example.com / User@123');
    console.log('\n🌐 You can now:');
    console.log('1. Login as admin to see analytics and manage users');
    console.log('2. Login as user to manage appliances and view consumption');
    console.log('3. Test all CRUD operations for appliances');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
};

completeSetup();