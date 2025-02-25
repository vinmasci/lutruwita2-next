import mongoose from 'mongoose';

// Cache the database connection
let cachedConnection = null;

export async function connectToDatabase() {
  // If the connection is already established, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Check for MongoDB URI with detailed logging
  console.log('Environment variables available:', Object.keys(process.env).filter(key => !key.includes('SECRET')));
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined. Available environment variables:', 
      Object.keys(process.env)
        .filter(key => !key.includes('SECRET') && !key.includes('KEY'))
        .join(', ')
    );
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  console.log('MongoDB URI found, attempting connection...');

  try {
    // Set up connection options for serverless environment
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // These options help with connection stability in serverless
      maxPoolSize: 10, // Limit number of connections
      minPoolSize: 1,  // Keep at least one connection open
    };

    // Connect to the database
    const connection = await mongoose.connect(uri, options);
    
    // Cache the connection
    cachedConnection = connection;
    
    console.log('Connected to MongoDB');
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
