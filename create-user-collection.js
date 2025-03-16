import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined');
  process.exit(1);
}

// Define the user data schema
const UserDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: String,
  email: String,
  website: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

async function createCollection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    
    console.log('Connected to MongoDB');
    
    // Create the model
    const UserData = mongoose.model('UserData', UserDataSchema);
    
    // Check if collection exists by trying to get its stats
    try {
      await mongoose.connection.db.listCollections({ name: 'userdatas' }).next();
      console.log('UserData collection already exists');
    } catch (error) {
      // Collection doesn't exist, create it
      console.log('Creating UserData collection...');
      await mongoose.connection.createCollection('userdatas');
      console.log('UserData collection created successfully');
    }
    
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createCollection();
