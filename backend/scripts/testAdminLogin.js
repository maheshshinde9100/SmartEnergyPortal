import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const testAdminLogin = async () => {
  try {
    console.log('🧪 Testing Admin Login...\n');

    // Connect to MongoDB Atlas
    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;
    
    await mongoose.connect(fullURI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find admin user
    console.log('\n🔍 Looking for admin user...');
    const adminUser = await User.findOne({ email: 'admin@portal.com' }).select('+password');
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Role:', adminUser.role);
    console.log('🔐 Password Hash:', adminUser.password ? 'Present' : 'Missing');
    console.log('✅ Active:', adminUser.isActive);
    console.log('✅ Verified:', adminUser.isVerified);

    // Test password comparison
    console.log('\n🔐 Testing password comparison...');
    const testPassword = 'Admin@123';
    
    console.log('Testing password:', testPassword);
    
    try {
      const isMatch = await adminUser.comparePassword(testPassword);
      console.log('Password match result:', isMatch);
      
      if (isMatch) {
        console.log('✅ Password comparison successful!');
      } else {
        console.log('❌ Password comparison failed!');
        
        // Let's try to manually verify the hash
        console.log('\n🔧 Manual password verification...');
        const manualCheck = await bcrypt.compare(testPassword, adminUser.password);
        console.log('Manual bcrypt.compare result:', manualCheck);
        
        if (!manualCheck) {
          console.log('❌ Password hash is incorrect. Let\'s fix it...');
          
          // Create new hash
          const newHash = await bcrypt.hash(testPassword, 12);
          console.log('🔧 New password hash created');
          
          // Update user
          adminUser.password = newHash;
          await adminUser.save();
          console.log('✅ Admin password updated successfully!');
          
          // Test again
          const retestMatch = await adminUser.comparePassword(testPassword);
          console.log('Retest password match:', retestMatch);
        }
      }
    } catch (error) {
      console.error('❌ Password comparison error:', error);
    }

    // Test login simulation
    console.log('\n🧪 Simulating login process...');
    
    const loginUser = await User.findOne({
      $or: [
        { email: 'admin@portal.com' },
        { msebCustomerId: 'admin@portal.com'.toUpperCase() }
      ]
    }).select('+password');

    if (loginUser) {
      console.log('✅ User found during login simulation');
      
      const passwordValid = await loginUser.comparePassword('Admin@123');
      console.log('Login password validation:', passwordValid);
      
      if (passwordValid) {
        console.log('✅ Login simulation successful!');
        console.log('User details:');
        console.log('- ID:', loginUser._id);
        console.log('- Email:', loginUser.email);
        console.log('- Role:', loginUser.role);
        console.log('- Active:', loginUser.isActive);
      } else {
        console.log('❌ Login simulation failed - password mismatch');
      }
    } else {
      console.log('❌ User not found during login simulation');
    }

    // Check all users
    console.log('\n👥 All users in database:');
    const allUsers = await User.find({}).select('email role isActive isVerified');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - Active: ${user.isActive}, Verified: ${user.isVerified}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📦 Database connection closed');
    process.exit(0);
  }
};

// Run the test
testAdminLogin();