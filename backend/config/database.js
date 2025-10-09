import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-energy-portal';
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    
    // Construct full URI with database name
    const fullURI = mongoURI.includes('mongodb+srv://') 
      ? (mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`)
      : mongoURI;
    
    console.log('🔍 Attempting to connect to MongoDB...');
    console.log('🔗 Database Name:', dbName);
    console.log('🔗 MongoDB URI:', fullURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

    const conn = await mongoose.connect(fullURI);

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📦 MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('📦 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;