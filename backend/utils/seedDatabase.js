import mongoose from 'mongoose';
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import TariffRate from '../models/TariffRate.js';
import bcrypt from 'bcryptjs';

// Seed default appliances
export const seedAppliances = async () => {
  try {
    const count = await Appliance.countDocuments({ isCustom: false });
    
    if (count === 0) {
      const defaultAppliances = [
        { name: 'LED Bulb (9W)', category: 'Lighting', defaultWattage: 9, isCustom: false, description: 'Energy efficient LED bulb' },
        { name: 'CFL Bulb (15W)', category: 'Lighting', defaultWattage: 15, isCustom: false, description: 'Compact fluorescent lamp' },
        { name: 'Incandescent Bulb (60W)', category: 'Lighting', defaultWattage: 60, isCustom: false, description: 'Traditional incandescent bulb' },
        { name: 'Tube Light (40W)', category: 'Lighting', defaultWattage: 40, isCustom: false, description: 'Fluorescent tube light' },
        { name: 'Ceiling Fan', category: 'Cooling', defaultWattage: 75, isCustom: false, description: 'Standard ceiling fan' },
        { name: 'Table Fan', category: 'Cooling', defaultWattage: 50, isCustom: false, description: 'Portable table fan' },
        { name: 'Air Conditioner (1.5 Ton)', category: 'Cooling', defaultWattage: 1500, isCustom: false, description: '1.5 ton split AC' },
        { name: 'Air Conditioner (1 Ton)', category: 'Cooling', defaultWattage: 1000, isCustom: false, description: '1 ton split AC' },
        { name: 'Air Cooler', category: 'Cooling', defaultWattage: 200, isCustom: false, description: 'Desert air cooler' },
        { name: 'Refrigerator (Single Door)', category: 'Kitchen', defaultWattage: 150, isCustom: false, description: 'Single door refrigerator' },
        { name: 'Refrigerator (Double Door)', category: 'Kitchen', defaultWattage: 250, isCustom: false, description: 'Double door refrigerator' },
        { name: 'Microwave Oven', category: 'Kitchen', defaultWattage: 1000, isCustom: false, description: 'Standard microwave oven' },
        { name: 'Electric Kettle', category: 'Kitchen', defaultWattage: 1500, isCustom: false, description: 'Electric water kettle' },
        { name: 'Mixer Grinder', category: 'Kitchen', defaultWattage: 500, isCustom: false, description: 'Kitchen mixer grinder' },
        { name: 'Induction Cooktop', category: 'Kitchen', defaultWattage: 2000, isCustom: false, description: 'Induction cooking stove' },
        { name: 'Electric Iron', category: 'Laundry', defaultWattage: 1000, isCustom: false, description: 'Steam iron' },
        { name: 'Washing Machine', category: 'Laundry', defaultWattage: 500, isCustom: false, description: 'Automatic washing machine' },
        { name: 'Television (LED 32")', category: 'Entertainment', defaultWattage: 60, isCustom: false, description: '32 inch LED TV' },
        { name: 'Television (LED 55")', category: 'Entertainment', defaultWattage: 150, isCustom: false, description: '55 inch LED TV' },
        { name: 'Desktop Computer', category: 'Office', defaultWattage: 300, isCustom: false, description: 'Desktop PC with monitor' },
        { name: 'Laptop', category: 'Office', defaultWattage: 65, isCustom: false, description: 'Laptop computer' },
        { name: 'Water Heater (Geyser)', category: 'Heating', defaultWattage: 2000, isCustom: false, description: 'Electric water heater' },
        { name: 'Room Heater', category: 'Heating', defaultWattage: 1500, isCustom: false, description: 'Electric room heater' },
        { name: 'Hair Dryer', category: 'Other', defaultWattage: 1200, isCustom: false, description: 'Electric hair dryer' },
        { name: 'Vacuum Cleaner', category: 'Other', defaultWattage: 800, isCustom: false, description: 'Vacuum cleaner' }
      ];

      await Appliance.insertMany(defaultAppliances);
      console.log('✅ Default appliances seeded successfully');
    } else {
      console.log('ℹ️  Default appliances already exist');
    }
  } catch (error) {
    console.error('❌ Error seeding appliances:', error);
  }
};

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
      console.log('✅ Admin user created (email: admin@portal.com, password: Admin@123)');
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
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
      console.log('✅ Default tariff rates seeded successfully');
    } else {
      console.log('ℹ️  Tariff rates already exist');
    }
  } catch (error) {
    console.error('❌ Error seeding tariff rates:', error);
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
      console.log('✅ Sample user created (email: user@example.com, password: user123)');
    } else {
      console.log('ℹ️  Sample user already exists');
    }
  } catch (error) {
    console.error('❌ Error creating sample user:', error);
  }
};

// Main seeding function
export const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await seedAdminUser();
    await seedAppliances();
    await seedTariffRates();
    await seedSampleUser();
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  }
};