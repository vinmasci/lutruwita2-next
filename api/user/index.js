import { connectToDatabase } from '../lib/db.js';
import { getUserInfo } from '../lib/auth0.js';
import mongoose from 'mongoose';

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
  picture: String, // Add field for profile picture URL
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 1
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Update the updatedAt field on save
UserDataSchema.pre('save', function(next) {
  console.log(`[API][DEBUG] Pre-save hook triggered for user ${this.userId}`);
  console.log(`[API][DEBUG] Pre-save document state:`, JSON.stringify(this, null, 2));
  this.updatedAt = new Date();
  console.log(`[API][DEBUG] Updated 'updatedAt' field to: ${this.updatedAt}`);
  next();
});

// Create or get the model - with better error handling
let UserData;
try {
  // Try to get the model if it already exists
  console.log('[API] Trying to get existing UserData model');
  UserData = mongoose.model('UserData');
  console.log('[API] Successfully retrieved existing UserData model');
} catch (error) {
  // If the model doesn't exist, create it
  console.log('[API] UserData model not found, creating new model');
  try {
    UserData = mongoose.model('UserData', UserDataSchema);
    console.log('[API] UserData model created');
  } catch (modelError) {
    console.error('[API] Error creating UserData model:', modelError);
    console.error('[API] Stack trace:', modelError.stack);
    // Use a simpler approach as fallback
    UserData = mongoose.models.UserData || mongoose.model('UserData', UserDataSchema);
    console.log('[API] UserData model created using fallback approach');
  }
}

// Helper function to log database operations
const logDbOperation = (operation, userId, success, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[API][${timestamp}] ${operation} for user ${userId}: ${success ? 'SUCCESS' : 'FAILED'}`);
  if (details.error) {
    console.error(`[API][${timestamp}] Error details:`, details.error);
    if (details.error.stack) {
      console.error(`[API][${timestamp}] Stack trace:`, details.error.stack);
    }
  }
  if (details.data) {
    console.log(`[API][${timestamp}] Data:`, details.data);
  }
};

// Helper function to safely find a user
const safelyFindUser = async (userId) => {
  try {
    console.log(`[API][DEBUG] safelyFindUser - Finding user with ID: ${userId}`);
    console.log(`[API][DEBUG] safelyFindUser - Using Mongoose model query at: ${new Date().toISOString()}`);
    const startTime = new Date().getTime();
    
    const result = await UserData.findOne({ userId });
    
    const endTime = new Date().getTime();
    console.log(`[API][DEBUG] safelyFindUser - Mongoose query completed in ${endTime - startTime}ms`);
    console.log(`[API][DEBUG] safelyFindUser - Result:`, result ? 'User found' : 'User not found');
    
    return result;
  } catch (error) {
    console.error(`[API][DEBUG] safelyFindUser - Error in Mongoose query:`, error);
    console.error(`[API][DEBUG] safelyFindUser - Error stack:`, error.stack);
    
    // Try a more direct approach
    try {
      console.log(`[API][DEBUG] safelyFindUser - Trying direct MongoDB query for user: ${userId}`);
      console.log(`[API][DEBUG] safelyFindUser - Direct query starting at: ${new Date().toISOString()}`);
      const startTime = new Date().getTime();
      
      const db = mongoose.connection.db;
      const collection = db.collection('userdatas');
      const result = await collection.findOne({ userId });
      
      const endTime = new Date().getTime();
      console.log(`[API][DEBUG] safelyFindUser - Direct query completed in ${endTime - startTime}ms`);
      console.log(`[API][DEBUG] safelyFindUser - Direct query result:`, result ? 'User found' : 'User not found');
      
      return result;
    } catch (directError) {
      console.error(`[API][DEBUG] safelyFindUser - Error in direct MongoDB query:`, directError);
      console.error(`[API][DEBUG] safelyFindUser - Direct query error stack:`, directError.stack);
      return null;
    }
  }
};

/**
 * Handler for GET /api/user
 * Retrieves user data from the database
 */
export async function getUserData(req, res) {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      console.log('[API] GET /api/user - Missing userId parameter');
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`[API] GET /api/user - Getting user data for: ${userId}`);
    
    // Connect to the database
    console.log(`[API] Connecting to database...`);
    try {
      await connectToDatabase();
      console.log(`[API] Database connection established`);
    } catch (dbError) {
      console.error(`[API] Database connection error:`, dbError);
      return res.status(500).json({ 
        error: 'Database connection error', 
        message: dbError.message
      });
    }
    
    // Find the user data in the database
    console.log(`[API] Searching for user in database: ${userId}`);
    let userData = null;
    
    try {
      userData = await safelyFindUser(userId);
      console.log(`[API] User search result:`, userData ? 'Found' : 'Not found');
    } catch (findError) {
      console.error(`[API] Error finding user:`, findError);
      // Continue with userData = null
    }
    
    if (!userData) {
      console.log(`[API] User data not found in database: ${userId}`);
      
      // If user data doesn't exist in our database, try to get basic info from Auth0
      console.log(`[API] Checking Auth0 for user info: ${userId}`);
      let auth0User = null;
      
      try {
        auth0User = await getUserInfo(userId);
        console.log(`[API] Auth0 user info result:`, auth0User ? 'Found' : 'Not found');
      } catch (auth0Error) {
        console.error(`[API] Error getting Auth0 user info:`, auth0Error);
        // Continue with auth0User = null
      }
      
      if (auth0User) {
        console.log(`[API] Auth0 user info found:`, auth0User);
        
        // Create a new user data record with Auth0 info and save it to the database
        console.log(`[API] Creating new user data from Auth0 info: ${userId}`);
        try {
          const newUserData = new UserData({
            userId,
            name: auth0User.name,
            email: auth0User.email,
            lastLogin: new Date(),
            loginCount: 1,
            metadata: {
              provider: auth0User.provider || 'unknown',
              created: new Date().toISOString(),
              auth0Data: auth0User
            }
          });
          
          // Save the new user data to the database
          console.log(`[API] Saving new user data to database: ${userId}`);
          await newUserData.save();
          logDbOperation('CREATE_USER', userId, true, { data: newUserData });
          console.log(`[API] New user data saved successfully: ${userId}`);
          userData = newUserData;
        } catch (saveError) {
          logDbOperation('CREATE_USER', userId, false, { error: saveError });
          console.error(`[API] Error saving new user data:`, saveError);
          
          // Return the data even if we couldn't save it
          userData = {
            userId,
            name: auth0User.name,
            email: auth0User.email,
            _unsaved: true
          };
          console.log(`[API] Returning unsaved user data: ${userId}`);
        }
      } else {
        console.log(`[API] No Auth0 user info found for: ${userId}`);
        
        // If we couldn't get user info from Auth0 either, create a minimal record
        console.log(`[API] Creating minimal user record for: ${userId}`);
        try {
          const minimalUserData = new UserData({
            userId,
            name: `User ${userId.substring(userId.lastIndexOf('|') + 1, userId.lastIndexOf('|') + 9)}`,
            lastLogin: new Date(),
            loginCount: 1,
            metadata: {
              created: new Date().toISOString(),
              source: 'minimal_creation'
            }
          });
          
          console.log(`[API] Saving minimal user data to database: ${userId}`);
          await minimalUserData.save();
          logDbOperation('CREATE_MINIMAL_USER', userId, true, { data: minimalUserData });
          console.log(`[API] Minimal user data saved successfully: ${userId}`);
          userData = minimalUserData;
        } catch (saveError) {
          logDbOperation('CREATE_MINIMAL_USER', userId, false, { error: saveError });
          console.error(`[API] Error saving minimal user data:`, saveError);
          
          // Return a basic object if we couldn't save
          userData = { 
            userId,
            name: `User ${userId.substring(userId.indexOf('|') + 1, userId.indexOf('|') + 8)}`,
            _unsaved: true
          };
          console.log(`[API] Returning unsaved minimal user data: ${userId}`);
        }
      }
    } else {
      console.log(`[API] User found in database: ${userId}`);
      logDbOperation('GET_USER', userId, true, { data: userData });
      
      // Update login information
      try {
        console.log(`[API] Updating login information for: ${userId}`);
        userData.lastLogin = new Date();
        userData.loginCount = (userData.loginCount || 0) + 1;
        await userData.save();
        console.log(`[API] Login information updated for: ${userId}`);
      } catch (updateError) {
        console.error(`[API] Error updating login information:`, updateError);
        // Continue with the existing data
      }
    }
    
    // Ensure we have a valid response object
    const responseData = userData && userData.toObject ? userData.toObject() : userData;
    
    console.log(`[API] Returning user data for: ${userId}`);
    return res.status(200).json(responseData || { userId, _created: false });
  } catch (error) {
    logDbOperation('GET_USER', req.query.userId || 'unknown', false, { error });
    console.error(`[API] Error getting user data:`, error);
    console.error(`[API] Error details:`, error.stack);
    
    // Return a more graceful error response
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      userId: req.query.userId,
      _error: true
    });
  }
}

/**
 * Handler for POST /api/user
 * Creates or updates user data in the database
 */
export async function updateUserData(req, res) {
  try {
    console.log(`[API][DEBUG] updateUserData function called at ${new Date().toISOString()}`);
    console.log(`[API][DEBUG] Environment variables available:`, 
      Object.keys(process.env)
        .filter(key => !key.includes('SECRET') && !key.includes('KEY'))
        .join(', ')
    );
    console.log(`[API][DEBUG] MONGODB_URI available:`, !!process.env.MONGODB_URI);
    console.log(`[API][DEBUG] MONGODB_URI length:`, process.env.MONGODB_URI?.length || 0);
    
    const { userId, name, email, website, picture } = req.body;
    
    if (!userId) {
      console.log('[API][DEBUG] POST /api/user - Missing userId in request body');
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`[API][DEBUG] POST /api/user - Updating user data for: ${userId}`);
    console.log(`[API][DEBUG] Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`[API][DEBUG] Request headers:`, JSON.stringify(req.headers, null, 2));
    
    // Connect to the database
    console.log(`[API][DEBUG] Connecting to database...`);
    try {
      console.log(`[API][DEBUG] Before connectToDatabase call at ${new Date().toISOString()}`);
      await connectToDatabase();
      console.log(`[API][DEBUG] After connectToDatabase call at ${new Date().toISOString()}`);
      console.log(`[API][DEBUG] Database connection established`);
      
      // Check mongoose connection state
      const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
      console.log(`[API][DEBUG] Mongoose connection state: ${states[mongoose.connection.readyState]}`);
      
      if (mongoose.connection.readyState !== 1) {
        console.error(`[API][DEBUG] Mongoose connection not ready: ${states[mongoose.connection.readyState]}`);
        throw new Error(`Database connection not ready: ${states[mongoose.connection.readyState]}`);
      }
    } catch (dbError) {
      console.error(`[API][DEBUG] Database connection error:`, dbError);
      console.error(`[API][DEBUG] Database connection error name:`, dbError.name);
      console.error(`[API][DEBUG] Database connection error message:`, dbError.message);
      console.error(`[API][DEBUG] Database connection error stack:`, dbError.stack);
      return res.status(500).json({ 
        error: 'Database connection error', 
        message: dbError.message,
        userId
      });
    }
    
    // Find the user data or create a new one
    console.log(`[API][DEBUG] Searching for user in database: ${userId}`);
    let userData = null;
    
    try {
      userData = await safelyFindUser(userId);
      console.log(`[API][DEBUG] User search result:`, userData ? 'Found' : 'Not found');
      if (userData) {
        console.log(`[API][DEBUG] Found user data:`, JSON.stringify(userData, null, 2));
      }
    } catch (findError) {
      console.error(`[API][DEBUG] Error finding user:`, findError);
      console.error(`[API][DEBUG] Error finding user stack:`, findError.stack);
      // Continue with userData = null
    }
    
    if (!userData) {
      console.log(`[API][DEBUG] User not found, creating new user data for: ${userId}`);
      try {
        userData = new UserData({ 
          userId,
          createdAt: new Date(),
          lastLogin: new Date(),
          loginCount: 1,
          metadata: {
            created: new Date().toISOString(),
            source: 'update_api'
          }
        });
        console.log(`[API][DEBUG] New user object created: ${userId}`);
        console.log(`[API][DEBUG] New user data:`, JSON.stringify(userData, null, 2));
      } catch (createError) {
        console.error(`[API][DEBUG] Error creating new user object:`, createError);
        console.error(`[API][DEBUG] Error creating new user object stack:`, createError.stack);
        
        // Return a basic response if we can't create the user
        return res.status(200).json({ 
          userId,
          name: name || 'User',
          email: email || '',
          website: website || '',
          _created: false,
          message: 'User data updated in memory only'
        });
      }
    } else {
      console.log(`[API][DEBUG] Existing user found: ${userId}`);
    }
    
    // Update the fields
    const updates = {};
    if (name !== undefined) {
      console.log(`[API][DEBUG] Updating name for ${userId}: ${name}`);
      userData.name = name;
      updates.name = name;
    }
    if (email !== undefined) {
      console.log(`[API][DEBUG] Updating email for ${userId}: ${email}`);
      userData.email = email;
      updates.email = email;
    }
    if (website !== undefined) {
      console.log(`[API][DEBUG] Updating website for ${userId}: ${website}`);
      userData.website = website;
      updates.website = website;
    }
    if (picture !== undefined) {
      console.log(`[API][DEBUG] Updating picture for ${userId}: ${picture}`);
      userData.picture = picture;
      updates.picture = picture;
    }
    
    // Always update the updatedAt field
    userData.updatedAt = new Date();
    updates.updatedAt = userData.updatedAt;
    
    console.log(`[API][DEBUG] Saving user data for ${userId}:`, JSON.stringify(updates, null, 2));
    
    try {
      // Save the user data
      console.log(`[API][DEBUG] Attempting to save user data to database: ${userId}`);
      console.log(`[API][DEBUG] MongoDB save operation starting at: ${new Date().toISOString()}`);
      const startTime = new Date().getTime();
      
      const savedData = await userData.save();
      
      const endTime = new Date().getTime();
      console.log(`[API][DEBUG] MongoDB save completed in ${endTime - startTime}ms`);
      
      logDbOperation('UPDATE_USER', userId, true, { data: updates });
      console.log(`[API][DEBUG] User data saved successfully for: ${userId}`);
      console.log(`[API][DEBUG] Saved data:`, JSON.stringify(savedData, null, 2));
      
      // Ensure we have a valid response object
      const responseData = savedData && savedData.toObject ? savedData.toObject() : savedData;
      console.log(`[API][DEBUG] Returning response data:`, JSON.stringify(responseData, null, 2));
      return res.status(200).json(responseData);
    } catch (saveError) {
      logDbOperation('UPDATE_USER', userId, false, { error: saveError });
      console.error(`[API][DEBUG] Error saving user data for ${userId}:`, saveError);
      console.error(`[API][DEBUG] Error stack:`, saveError.stack);
      
      // Try a direct update approach
      try {
        console.log(`[API][DEBUG] Trying direct MongoDB update for user: ${userId}`);
        console.log(`[API][DEBUG] Direct update starting at: ${new Date().toISOString()}`);
        const startTime = new Date().getTime();
        
        const db = mongoose.connection.db;
        const collection = db.collection('userdatas');
        
        const updateDoc = { 
          $set: { 
            ...updates,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date(),
            lastLogin: new Date(),
            loginCount: 1
          }
        };
        
        console.log(`[API][DEBUG] Update document:`, JSON.stringify(updateDoc, null, 2));
        
        const updateResult = await collection.updateOne(
          { userId },
          updateDoc,
          { upsert: true }
        );
        
        const endTime = new Date().getTime();
        console.log(`[API][DEBUG] Direct update completed in ${endTime - startTime}ms`);
        console.log(`[API][DEBUG] Direct update result:`, JSON.stringify(updateResult, null, 2));
        
        // Return the updated data
        const responseData = {
          userId,
          name: name || userData?.name || 'User',
          email: email || userData?.email || '',
          website: website || userData?.website || '',
          updatedAt: new Date(),
          _directUpdate: true
        };
        
        console.log(`[API][DEBUG] Returning direct update response:`, JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);
      } catch (directUpdateError) {
        console.error(`[API][DEBUG] Error in direct update:`, directUpdateError);
        console.error(`[API][DEBUG] Error stack:`, directUpdateError.stack);
        
        // Return the data even if we couldn't save it
        const responseData = {
          userId,
          name: name || userData?.name || 'User',
          email: email || userData?.email || '',
          website: website || userData?.website || '',
          _unsaved: true,
          message: 'User data updated in memory only'
        };
        
        console.log(`[API][DEBUG] Returning fallback response:`, JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);
      }
    }
  } catch (error) {
    logDbOperation('UPDATE_USER', req.body?.userId || 'unknown', false, { error });
    console.error(`[API][DEBUG] Fatal error updating user data:`, error);
    console.error(`[API][DEBUG] Fatal error stack:`, error.stack);
    
    // Return a more graceful error response
    const responseData = { 
      userId: req.body?.userId,
      name: req.body?.name || 'User',
      email: req.body?.email || '',
      website: req.body?.website || '',
      _error: true,
      message: 'Error occurred but data was processed in memory'
    };
    
    console.log(`[API][DEBUG] Returning error fallback response:`, JSON.stringify(responseData, null, 2));
    return res.status(200).json(responseData);
  }
}

/**
 * Main handler for /api/user
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Route the request based on the method
  if (req.method === 'GET') {
    return getUserData(req, res);
  } else if (req.method === 'POST') {
    return updateUserData(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
