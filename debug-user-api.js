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

async function debugUserApi() {
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
    
    // Check if the collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));
    
    // Check if the userdatas collection exists
    const userCollection = collections.find(c => c.name === 'userdatas');
    if (userCollection) {
      console.log('UserData collection exists');
    } else {
      console.log('UserData collection does not exist');
    }
    
    // Try to find the user
    const userId = 'google-oauth2|104387414892803104975';
    console.log(`Looking for user with ID: ${userId}`);
    
    try {
      const user = await UserData.findOne({ userId });
      if (user) {
        console.log('User found:', user);
      } else {
        console.log('User not found');
      }
    } catch (findError) {
      console.error('Error finding user:', findError);
    }
    
    // List all users in the collection
    console.log('Listing all users in the collection:');
    try {
      const users = await UserData.find({});
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`- ${user.userId}: ${user.name} (${user.email})`);
      });
    } catch (listError) {
      console.error('Error listing users:', listError);
    }
    
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugUserApi();
