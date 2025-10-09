import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const fixAdminPassword = async () => {
  try {
    console.log('🔧 Fixing Admin Password...\n');

    // Connect to MongoDB Atlas
    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;
    
    await mongoose.connect(fullURI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@portal.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:', adminUser.email);

    // Update password - this will trigger the pre-save hook to hash it properly
    adminUser.password = 'Admin@123';
    await adminUser.save();
    
    console.log('✅ Admin password updated successfully!');

    // Test the password
    console.log('\n🧪 Testing updated password...');
    const updatedUser = await User.findOne({ email: 'admin@portal.com' }).select('+password');
    const isMatch = await updatedUser.comparePassword('Admin@123');
    
    if (isMatch) {
      console.log('✅ Password test successful! Admin can now login.');
    } else {
      console.log('❌ Password test failed. There might be another issue.');
    }

    // Also fix other users
    console.log('\n👥 Fixing other user passwords...');
    const users = await User.find({ role: 'user' });
    
    for (const user of users) {
      user.password = 'User@123';
      await user.save();
      console.log(`✅ Fixed password for: ${user.email}`);
    }

    console.log('\n🎉 All passwords fixed successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin@portal.com / Admin@123');
    console.log('User1: user1@example.com / User@123');
    console.log('User2: user2@example.com / User@123');
    console.log('User3: user3@example.com / User@123');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📦 Database connection closed');
    process.exit(0);
  }
};

// Run the fix
fixAdminPassword();