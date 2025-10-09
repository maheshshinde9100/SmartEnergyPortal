import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-energy-portal');
    console.log('📦 Connected to MongoDB');

    // Find existing admin by MSEB ID or role
    let existingAdmin = await User.findOne({ 
      $or: [
        { msebCustomerId: 'ADMIN001' },
        { role: 'admin' }
      ]
    });
    
    if (existingAdmin) {
      console.log('ℹ️  Found existing admin user:');
      console.log('📧 Current Email:', existingAdmin.email);
      console.log('🆔 MSEB ID:', existingAdmin.msebCustomerId);
      console.log('👤 Role:', existingAdmin.role);
      
      // Update to the required credentials
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      existingAdmin.email = 'admin@portal.com';
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.isVerified = true;
      existingAdmin.emailVerified = true;
      existingAdmin.mobileVerified = true;
      
      await existingAdmin.save();
      console.log('✅ Admin user updated successfully!');
      console.log('📧 New Email: admin@portal.com');
      console.log('🔑 New Password: Admin@123');
    } else {
      // Create new admin user with unique MSEB ID
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      
      const adminUser = new User({
        msebCustomerId: 'ADMIN002',
        email: 'admin@portal.com',
        mobile: '9999999998',
        password: hashedPassword,
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
        mobileVerified: true
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@portal.com');
      console.log('🔑 Password: Admin@123');
      console.log('🆔 MSEB ID: ADMIN002');
    }

    // List all admin users
    const allAdmins = await User.find({ role: 'admin' }).select('-password');
    console.log('\n📋 All admin users:');
    allAdmins.forEach(admin => {
      console.log(`- ${admin.email} (${admin.msebCustomerId}) - ${admin.profile.firstName} ${admin.profile.lastName}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createAdmin();