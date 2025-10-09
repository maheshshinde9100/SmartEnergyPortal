import mongoose from 'mongoose';
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import TariffRate from '../models/TariffRate.js';
import bcrypt from 'bcryptjs';

// Note: Appliance seeding removed - all appliances are now user-created

// Seed admin user
export const seedAdminUser = async () => {
  try {
    let adminUser = await User.findOne({ email: 'admin@portal.com' });
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      adminUser = new User({
        msebCustomerId: 'ADMIN001',
        email: 'admin@portal.com',
        mobile: '9999999999',
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
      // Admin user created successfully
    } else {
      // Admin user already exists
    }
    
    return adminUser;
  } catch (error) {
    // Error creating admin user
    return null;
  }
};

// Seed default tariff rates
export const seedTariffRates = async () => {
  try {
    const count = await TariffRate.countDocuments();
    
    if (count === 0) {
      // Get or create admin user
      let adminUser = await User.findOne({ email: 'admin@portal.com' });
      if (!adminUser) {
        adminUser = await seedAdminUser();
      }

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
      // Default tariff rates seeded successfully
    } else {
      // Tariff rates already exist
    }
  } catch (error) {
    // Error seeding tariff rates
  }
};

// Seed sample user (for testing)
export const seedSampleUser = async () => {
  try {
    const existingUser = await User.findOne({ email: 'user@example.com' });
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('user123', 12);
      const sampleUser = new User({
        msebCustomerId: 'MSEB001234',
        email: 'user@example.com',
        mobile: '9876543210',
        password: hashedPassword,
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
        mobileVerified: true
      });
      
      await sampleUser.save();
      // Sample user created successfully
    } else {
      // Sample user already exists
    }
  } catch (error) {
    // Error creating sample user
  }
};

// Main seeding function
export const seedDatabase = async () => {
  try {
    // Starting database seeding...
    
    await seedAdminUser();
    await seedTariffRates();
    await seedSampleUser();
    
    // Database seeding completed successfully
  } catch (error) {
    // Database seeding failed
  }
};