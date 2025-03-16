import mongoose from 'mongoose';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

async function createUser(userId) {
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
    
    // Check if the user already exists
    const existingUser = await UserData.findOne({ userId });
    
    if (existingUser) {
      console.log('User already exists:', existingUser);
      rl.close();
      return;
    }
    
    // Prompt for user details
    rl.question('Enter name (or press Enter for "Test User"): ', (name) => {
      rl.question('Enter email (or press Enter for "test@example.com"): ', (email) => {
        rl.question('Enter website (or press Enter for "https://example.com"): ', async (website) => {
          // Create user object with provided or default values
          const userData = {
            userId,
            name: name || 'Test User',
            email: email || 'test@example.com',
            website: website || 'https://example.com',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          try {
            // Create and save the user
            const newUser = new UserData(userData);
            await newUser.save();
            
            console.log('User created successfully:', newUser);
          } catch (error) {
            console.error('Error creating user:', error);
          } finally {
            rl.close();
          }
        });
      });
    });
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Main function
function main() {
  console.log('=== Create User in MongoDB ===');
  console.log('This script will create a user record in the MongoDB database.');
  console.log('You need to provide your Auth0 user ID.');
  console.log('You can get your Auth0 user ID by opening get-auth0-user-id.html in a browser.');
  console.log('');
  
  rl.question('Enter your Auth0 user ID: ', (userId) => {
    if (!userId) {
      console.error('Auth0 user ID is required');
      rl.close();
      return;
    }
    
    createUser(userId);
  });
}

// Handle readline close
rl.on('close', () => {
  console.log('Done');
  process.exit(0);
});

// Start the script
main();
