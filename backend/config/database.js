import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-energy-portal';
    const dbName = process.env.MONGODB_DB || 'smart-energy-portal';
    
    // Construct full URI with database name
    const fullURI = mongoURI.includes('mongodb+srv://') 
      ? (mongoURI.endsWith('/') ? `${mongoURI}${dbName}` : `${mongoURI}/${dbName}`)
      : mongoURI;
    
    // Connecting to MongoDB...

    const conn = await mongoose.connect(fullURI);

    // MongoDB Connected successfully
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      // MongoDB disconnected
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;