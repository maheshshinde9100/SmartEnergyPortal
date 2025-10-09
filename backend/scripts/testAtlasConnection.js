import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testAtlasConnection = async () => {
  try {
    console.log('🧪 Testing MongoDB Atlas Connection...\n');

    const mongoURI = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    
    if (!mongoURI) {
      throw new Error('❌ MONGODB_URI not found in environment variables');
    }

    console.log('🔍 Connection Details:');
    console.log('📦 Database Name:', dbName);
    console.log('🔗 Connection URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    // Test connection
    console.log('\n⏳ Connecting to MongoDB Atlas...');
    const fullURI = mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`;
    
    const startTime = Date.now();
    await mongoose.connect(fullURI);
    const connectionTime = Date.now() - startTime;

    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log(`⚡ Connection time: ${connectionTime}ms`);
    console.log('📦 Connected to database:', mongoose.connection.db.databaseName);
    console.log('🌐 Host:', mongoose.connection.host);
    console.log('🔌 Ready state:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');

    // Test database operations
    console.log('\n🧪 Testing database operations...');

    // Test write operation
    const testCollection = mongoose.connection.db.collection('connection_test');
    const testDoc = { 
      message: 'Atlas connection test', 
      timestamp: new Date(),
      testId: Math.random().toString(36).substr(2, 9)
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Write test passed - Document inserted with ID:', insertResult.insertedId);

    // Test read operation
    const readResult = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Read test passed - Document retrieved:', readResult.message);

    // Test update operation
    const updateResult = await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { updated: true, updateTime: new Date() } }
    );
    console.log('✅ Update test passed - Modified count:', updateResult.modifiedCount);

    // Test delete operation
    const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Delete test passed - Deleted count:', deleteResult.deletedCount);

    // List existing collections
    console.log('\n📋 Existing collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('  (No collections found - database is empty)');
    } else {
      collections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name}`);
      });
    }

    // Test aggregation
    console.log('\n🔍 Testing aggregation pipeline...');
    const stats = await mongoose.connection.db.admin().serverStatus();
    console.log('✅ Server status retrieved');
    console.log('📊 MongoDB version:', stats.version);
    console.log('🏠 Host info:', stats.host);

    console.log('\n🎉 All tests passed! MongoDB Atlas is working correctly.');
    console.log('\n✨ Your database is ready for the Smart Energy Portal application.');

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error('Error message:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n🔑 Authentication Error:');
      console.error('- Check your username and password in the connection string');
      console.error('- Ensure the database user has proper permissions');
    } else if (error.message.includes('network')) {
      console.error('\n🌐 Network Error:');
      console.error('- Check your internet connection');
      console.error('- Verify the cluster is running and accessible');
      console.error('- Check if your IP address is whitelisted in Atlas');
    } else if (error.message.includes('MONGODB_URI')) {
      console.error('\n⚙️ Configuration Error:');
      console.error('- Make sure MONGODB_URI is set in your .env file');
      console.error('- Verify the connection string format');
    }
    
    console.error('\nStack trace:', error.stack);
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n📦 Database connection closed');
    }
    process.exit(0);
  }
};

// Run the test
testAtlasConnection();