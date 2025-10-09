import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const updatePasswords = async () => {
  try {
    console.log('🔐 Starting Password Update...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-energy-portal');
    console.log('📦 Connected to MongoDB');

    // Update sample users passwords
    console.log('\n👥 Updating sample user passwords...');
    
    const users = [
      { email: 'user1@example.com', newPassword: 'User@123' },
      { email: 'user2@example.com', newPassword: 'User@123' }
    ];

    for (const userData of users) {
      const user = await User.findOne({ email: userData.email });
      if (user) {
        user.password = userData.newPassword; // Let the pre-save hook hash it
        await user.save();
        console.log(`✅ Updated password for ${userData.email}`);
        
        // Test the new password
        const testUser = await User.findOne({ email: userData.email }).select('+password');
        const isValid = await testUser.comparePassword(userData.newPassword);
        console.log(`🔐 Password test for ${userData.email}: ${isValid ? '✅ Success' : '❌ Failed'}`);
      } else {
        console.log(`❌ User not found: ${userData.email}`);
      }
    }

    // Verify admin user
    console.log('\n🔍 Verifying admin user...');
    const admin = await User.findOne({ email: 'admin@portal.com' }).select('+password');
    if (admin) {
      const isAdminValid = await admin.comparePassword('Admin@123');
      console.log(`🔐 Admin password test: ${isAdminValid ? '✅ Success' : '❌ Failed'}`);
      console.log(`👤 Admin role: ${admin.role}`);
      console.log(`✅ Admin active: ${admin.isActive}`);
    } else {
      console.log('❌ Admin user not found');
    }

    // List all users
    console.log('\n📋 All users in database:');
    const allUsers = await User.find({}).select('email role isActive');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.isActive ? 'Active' : 'Inactive'}`);
    });

    await mongoose.disconnect();
    console.log('\n🎉 Password update completed successfully!');
    console.log('\n📋 Updated Login Credentials:');
    console.log('🔐 Admin: admin@portal.com / Admin@123');
    console.log('👤 User1: user1@example.com / User@123');
    console.log('👤 User2: user2@example.com / User@123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Password update failed:', error);
    process.exit(1);
  }
};

updatePasswords();