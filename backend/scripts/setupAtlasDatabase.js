import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Import all models
import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import Consumption from '../models/Consumption.js';
import TariffRate from '../models/TariffRate.js';

// Load environment variables
dotenv.config();

const setupAtlasDatabase = async () => {
  try {
    console.log('🚀 Starting MongoDB Atlas Database Setup...\n');

    // Connect to MongoDB Atlas
    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🔍 Connecting to MongoDB Atlas...');
    console.log('🔗 Database Name:', dbName);
    console.log('🔗 Connection URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    // Connect with database name
    const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;
    await mongoose.connect(fullURI);

    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('📦 Database:', mongoose.connection.db.databaseName);
    console.log('📦 Host:', mongoose.connection.host);
    console.log('📦 Port:', mongoose.connection.port || 'default');

    // Test database operations
    console.log('\n🧪 Testing database operations...');

    // 1. Create Collections and Indexes
    console.log('\n📋 Creating collections and indexes...');
    
    // Create User collection with indexes
    await User.createIndexes();
    console.log('✅ User collection and indexes created');

    // Create Appliance collection with indexes
    await Appliance.createIndexes();
    console.log('✅ Appliance collection and indexes created');

    // Create Consumption collection with indexes
    await Consumption.createIndexes();
    console.log('✅ Consumption collection and indexes created');

    // Create TariffRate collection with indexes
    await TariffRate.createIndexes();
    console.log('✅ TariffRate collection and indexes created');

    // 2. Clear existing data (for fresh setup)
    console.log('\n🧹 Clearing existing data...');
    await User.deleteMany({});
    await Appliance.deleteMany({});
    await Consumption.deleteMany({});
    await TariffRate.deleteMany({});
    console.log('✅ Existing data cleared');

    // 3. Create Admin User
    console.log('\n👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const adminUser = new User({
      email: 'admin@portal.com',
      mobile: '9876543210',
      password: adminPassword,
      role: 'admin',
      isVerified: true,
      emailVerified: true,
      mobileVerified: true,
      isActive: true,
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        address: {
          village: 'Admin Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001'
        }
      },
      msebCustomerId: 'ADMIN001'
    });
    await adminUser.save();
    console.log('✅ Admin user created:', adminUser.email);

    // 4. Create Sample Users
    console.log('\n👥 Creating sample users...');
    const sampleUsers = [
      {
        email: 'user1@example.com',
        mobile: '9876543211',
        password: await bcrypt.hash('User@123', 12),
        role: 'user',
        isVerified: true,
        emailVerified: true,
        mobileVerified: true,
        isActive: true,
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          address: {
            village: 'Andheri Village',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400002'
          }
        },
        msebCustomerId: 'MSEB001234'
      },
      {
        email: 'user2@example.com',
        mobile: '9876543212',
        password: await bcrypt.hash('User@123', 12),
        role: 'user',
        isVerified: true,
        emailVerified: true,
        mobileVerified: true,
        isActive: true,
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          address: {
            village: 'Kothrud Village',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001'
          }
        },
        msebCustomerId: 'MSEB001235'
      },
      {
        email: 'user3@example.com',
        mobile: '9876543213',
        password: await bcrypt.hash('User@123', 12),
        role: 'user',
        isVerified: true,
        emailVerified: true,
        mobileVerified: true,
        isActive: true,
        profile: {
          firstName: 'Raj',
          lastName: 'Patel',
          address: {
            village: 'Sitabuldi Village',
            city: 'Nagpur',
            state: 'Maharashtra',
            pincode: '440001'
          }
        },
        msebCustomerId: 'MSEB001236'
      }
    ];

    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} sample users`);

    // 5. Create Default Appliances
    console.log('\n🔌 Creating default appliances...');
    const defaultAppliances = [
      {
        name: 'LED Bulb (9W)',
        category: 'Lighting',
        defaultWattage: 9,
        isCustom: false,
        usageHints: {
          minHours: 4,
          maxHours: 12,
          peakUsageTime: 'evening',
          typicalUsage: 'Typically used 4-12 hours per day during evening'
        }
      },
      {
        name: 'CFL Bulb (15W)',
        category: 'Lighting',
        defaultWattage: 15,
        isCustom: false,
        usageHints: {
          minHours: 3,
          maxHours: 10,
          peakUsageTime: 'evening',
          typicalUsage: 'Typically used 3-10 hours per day during evening'
        }
      },
      {
        name: 'Ceiling Fan',
        category: 'Cooling',
        defaultWattage: 75,
        isCustom: false,
        usageHints: {
          minHours: 6,
          maxHours: 16,
          peakUsageTime: 'afternoon',
          typicalUsage: 'Typically used 6-16 hours per day during afternoon'
        }
      },
      {
        name: 'Air Conditioner (1.5 Ton)',
        category: 'Cooling',
        defaultWattage: 1500,
        isCustom: false,
        usageHints: {
          minHours: 4,
          maxHours: 12,
          peakUsageTime: 'afternoon',
          typicalUsage: 'Typically used 4-12 hours per day during afternoon'
        }
      },
      {
        name: 'Refrigerator (Double Door)',
        category: 'Kitchen',
        defaultWattage: 250,
        isCustom: false,
        usageHints: {
          minHours: 20,
          maxHours: 24,
          peakUsageTime: 'all-day',
          typicalUsage: 'Typically used 20-24 hours per day during all-day'
        }
      },
      {
        name: 'Microwave Oven',
        category: 'Kitchen',
        defaultWattage: 1000,
        isCustom: false,
        usageHints: {
          minHours: 0.5,
          maxHours: 2,
          peakUsageTime: 'morning',
          typicalUsage: 'Typically used 0.5-2 hours per day during morning'
        }
      },
      {
        name: 'Washing Machine',
        category: 'Laundry',
        defaultWattage: 500,
        isCustom: false,
        usageHints: {
          minHours: 1,
          maxHours: 3,
          peakUsageTime: 'morning',
          typicalUsage: 'Typically used 1-3 hours per day during morning'
        }
      },
      {
        name: 'Television (LED 32")',
        category: 'Entertainment',
        defaultWattage: 60,
        isCustom: false,
        usageHints: {
          minHours: 3,
          maxHours: 8,
          peakUsageTime: 'evening',
          typicalUsage: 'Typically used 3-8 hours per day during evening'
        }
      },
      {
        name: 'Desktop Computer',
        category: 'Office',
        defaultWattage: 300,
        isCustom: false,
        usageHints: {
          minHours: 4,
          maxHours: 12,
          peakUsageTime: 'afternoon',
          typicalUsage: 'Typically used 4-12 hours per day during afternoon'
        }
      },
      {
        name: 'Water Heater (Geyser)',
        category: 'Heating',
        defaultWattage: 2000,
        isCustom: false,
        usageHints: {
          minHours: 1,
          maxHours: 3,
          peakUsageTime: 'morning',
          typicalUsage: 'Typically used 1-3 hours per day during morning'
        }
      }
    ];

    const createdAppliances = await Appliance.insertMany(defaultAppliances);
    console.log(`✅ Created ${createdAppliances.length} default appliances`);

    // 6. Create Sample Custom Appliances
    console.log('\n🔧 Creating sample custom appliances...');
    const customAppliances = [
      {
        name: 'Custom Water Pump',
        category: 'Other',
        defaultWattage: 750,
        description: 'High-efficiency water pump for home use',
        isCustom: true,
        createdBy: createdUsers[0]._id,
        usageHints: {
          minHours: 2,
          maxHours: 4,
          peakUsageTime: 'morning',
          typicalUsage: 'Typically used 2-4 hours per day during morning'
        }
      },
      {
        name: 'Industrial Heater',
        category: 'Industrial',
        defaultWattage: 3000,
        description: 'Heavy-duty industrial heating unit',
        isCustom: true,
        createdBy: createdUsers[1]._id,
        usageHints: {
          minHours: 6,
          maxHours: 10,
          peakUsageTime: 'afternoon',
          typicalUsage: 'Typically used 6-10 hours per day during afternoon'
        }
      }
    ];

    const createdCustomAppliances = await Appliance.insertMany(customAppliances);
    console.log(`✅ Created ${createdCustomAppliances.length} custom appliances`);

    // 7. Create Tariff Rates
    console.log('\n💰 Creating tariff rates...');
    const tariffRate = new TariffRate({
      slabs: [
        { minUnits: 0, maxUnits: 100, ratePerUnit: 3.5 },
        { minUnits: 101, maxUnits: 300, ratePerUnit: 4.5 },
        { minUnits: 301, maxUnits: 500, ratePerUnit: 6.0 },
        { minUnits: 501, maxUnits: 999999, ratePerUnit: 7.5 }
      ],
      effectiveFrom: new Date('2024-01-01'),
      description: 'Standard MSEB tariff rates for residential consumers',
      isActive: true,
      createdBy: adminUser._id
    });
    await tariffRate.save();
    console.log('✅ Tariff rates created');

    // 8. Create Sample Consumption Data
    console.log('\n📊 Creating sample consumption data...');
    const currentDate = new Date();
    const consumptionData = [];

    // Create consumption data for last 6 months for each user
    for (let userIndex = 0; userIndex < createdUsers.length; userIndex++) {
      const user = createdUsers[userIndex];
      
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const targetDate = new Date(currentDate);
        targetDate.setMonth(targetDate.getMonth() - monthOffset);
        
        const month = targetDate.getMonth() + 1;
        const year = targetDate.getFullYear();

        // Select random appliances for this user
        const userAppliances = [
          {
            applianceId: createdAppliances[0]._id, // LED Bulb
            quantity: 4,
            dailyHours: 6 + Math.random() * 4, // 6-10 hours
            customWattage: null
          },
          {
            applianceId: createdAppliances[2]._id, // Ceiling Fan
            quantity: 2,
            dailyHours: 8 + Math.random() * 6, // 8-14 hours
            customWattage: null
          },
          {
            applianceId: createdAppliances[4]._id, // Refrigerator
            quantity: 1,
            dailyHours: 24, // Always on
            customWattage: null
          },
          {
            applianceId: createdAppliances[7]._id, // Television
            quantity: 1,
            dailyHours: 4 + Math.random() * 4, // 4-8 hours
            customWattage: null
          }
        ];

        // Add AC for some users in summer months
        if (month >= 4 && month <= 9 && userIndex < 2) {
          userAppliances.push({
            applianceId: createdAppliances[3]._id, // AC
            quantity: 1,
            dailyHours: 6 + Math.random() * 4, // 6-10 hours
            customWattage: null
          });
        }

        // Calculate total consumption
        let totalUnits = 0;
        const processedAppliances = [];

        for (const appUsage of userAppliances) {
          const appliance = createdAppliances.find(app => app._id.equals(appUsage.applianceId));
          const wattage = appUsage.customWattage || appliance.defaultWattage;
          const dailyConsumption = (wattage * appUsage.dailyHours) / 1000; // kWh
          const monthlyConsumption = dailyConsumption * 30; // 30 days
          const totalApplianceConsumption = monthlyConsumption * appUsage.quantity;
          
          totalUnits += totalApplianceConsumption;
          processedAppliances.push(appUsage);
        }

        // Calculate bill using tariff
        const estimatedBill = tariffRate.calculateBill(totalUnits);

        const consumption = {
          userId: user._id,
          month,
          year,
          appliances: processedAppliances,
          totalUnits: Math.round(totalUnits * 100) / 100,
          estimatedBill: Math.round(estimatedBill * 100) / 100
        };

        consumptionData.push(consumption);
      }
    }

    const createdConsumption = await Consumption.insertMany(consumptionData);
    console.log(`✅ Created ${createdConsumption.length} consumption records`);

    // 9. Verify Database Structure
    console.log('\n🔍 Verifying database structure...');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections created:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });

    // Count documents in each collection
    const userCount = await User.countDocuments();
    const applianceCount = await Appliance.countDocuments();
    const consumptionCount = await Consumption.countDocuments();
    const tariffCount = await TariffRate.countDocuments();

    console.log('\n📊 Document counts:');
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Appliances: ${applianceCount}`);
    console.log(`  - Consumption Records: ${consumptionCount}`);
    console.log(`  - Tariff Rates: ${tariffCount}`);

    // 10. Test API Operations
    console.log('\n🧪 Testing API operations...');
    
    // Test user authentication
    const testUser = await User.findOne({ email: 'user1@example.com' });
    console.log('✅ User query test passed');

    // Test appliance queries
    const testAppliances = await Appliance.find({ category: 'Lighting' });
    console.log(`✅ Appliance query test passed (${testAppliances.length} lighting appliances)`);

    // Test consumption aggregation
    const testConsumption = await Consumption.aggregate([
      { $group: { _id: null, totalUnits: { $sum: '$totalUnits' } } }
    ]);
    console.log(`✅ Consumption aggregation test passed (${testConsumption[0]?.totalUnits?.toFixed(2)} total kWh)`);

    console.log('\n🎉 MongoDB Atlas Database Setup Complete!');
    console.log('\n📋 Setup Summary:');
    console.log(`✅ Database: ${mongoose.connection.db.databaseName}`);
    console.log(`✅ Collections: ${collections.length}`);
    console.log(`✅ Users: ${userCount} (1 admin + ${userCount - 1} regular users)`);
    console.log(`✅ Appliances: ${applianceCount} (${applianceCount - 2} default + 2 custom)`);
    console.log(`✅ Consumption Records: ${consumptionCount}`);
    console.log(`✅ Tariff Rates: ${tariffCount}`);

    console.log('\n🔑 Login Credentials:');
    console.log('Admin: admin@portal.com / Admin@123');
    console.log('User1: user1@example.com / User@123');
    console.log('User2: user2@example.com / User@123');
    console.log('User3: user3@example.com / User@123');

    console.log('\n🚀 Your Smart Energy Portal is ready to use!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n📦 Database connection closed');
    process.exit(0);
  }
};

// Run the setup
setupAtlasDatabase();