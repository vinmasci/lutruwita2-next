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

async function createTestUser() {
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
    
    // Create a test user - replace with your actual Auth0 user ID
    // You can find your Auth0 user ID in the browser console when you log in
    // It's usually in the format 'auth0|...' or 'google-oauth2|...'
    const testUser = {
      userId: 'google-oauth2|104387414892803104975', // Replace with your actual Auth0 user ID
      name: 'Test User',
      email: 'test@example.com',
      website: 'https://example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Check if the user already exists
    const existingUser = await UserData.findOne({ userId: testUser.userId });
    
    if (existingUser) {
      console.log('User already exists:', existingUser);
      process.exit(0);
    }
    
    // Create the user
    const newUser = new UserData(testUser);
    await newUser.save();
    
    console.log('Test user created successfully:', newUser);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
