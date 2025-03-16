import mongoose from 'mongoose';

// Cache the database connection
let cachedConnection = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Connect to MongoDB database with retry logic and detailed logging
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<mongoose.Connection>} - Mongoose connection object
 */
export async function connectToDatabase(retryCount = 0) {
  console.log(`[DB][DEBUG] Connection attempt ${retryCount + 1}${retryCount > 0 ? ' (retry)' : ''} at ${new Date().toISOString()}`);
  
  // If the connection is already established, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('[DB][DEBUG] Using existing database connection');
    return cachedConnection;
  }

  // Log connection state if it exists
  if (mongoose.connection) {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`[DB][DEBUG] Current connection state: ${states[mongoose.connection.readyState]}`);
    
    // If we're in the process of connecting, wait a bit
    if (mongoose.connection.readyState === 2) {
      console.log('[DB][DEBUG] Connection is in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return connectToDatabase(retryCount);
    }
  }
  
  // Log environment variables
  console.log('[DB][DEBUG] Environment variables available:', 
    Object.keys(process.env)
      .filter(key => !key.includes('SECRET') && !key.includes('KEY'))
      .join(', ')
  );

  // Check for MongoDB URI with detailed logging
  console.log('[DB][DEBUG] Checking for MongoDB URI...');
  console.log('[DB][DEBUG] Environment variables available:', 
    Object.keys(process.env)
      .filter(key => !key.includes('SECRET'))
      .length
  );
  
  const uri = process.env.MONGODB_URI;
  
  // More detailed logging for MONGODB_URI
  console.log('[DB][DEBUG] MONGODB_URI available:', !!uri);
  console.log('[DB][DEBUG] MONGODB_URI length:', uri?.length || 0);
  console.log('[DB][DEBUG] MONGODB_URI type:', typeof uri);
  
  if (!uri) {
    console.error('[DB][DEBUG] MONGODB_URI is not defined. Available environment variables:', 
      Object.keys(process.env)
        .filter(key => !key.includes('SECRET') && !key.includes('KEY'))
        .join(', ')
    );
    
    // Log other important environment variables
    console.log('[DB][DEBUG] NODE_ENV:', process.env.NODE_ENV);
    console.log('[DB][DEBUG] VERCEL_ENV:', process.env.VERCEL_ENV);
    console.log('[DB][DEBUG] VERCEL:', process.env.VERCEL);
    
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  
  // Log a sanitized version of the URI (hiding credentials)
  try {
    const sanitizedUri = uri.replace(/(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
    console.log(`[DB][DEBUG] MongoDB URI found: ${sanitizedUri}`);
    console.log(`[DB][DEBUG] MongoDB URI starts with:`, uri.substring(0, 10) + '...');
  } catch (e) {
    console.log('[DB][DEBUG] MongoDB URI found (unable to sanitize for logging)');
    console.error('[DB][DEBUG] Error sanitizing URI:', e);
  }
  
  console.log('[DB] Attempting connection...');
  connectionAttempts++;

  try {
    // Set up connection options for serverless environment
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // These options help with connection stability in serverless
      maxPoolSize: 10, // Limit number of connections
      minPoolSize: 1,  // Keep at least one connection open
      connectTimeoutMS: 10000, // 10 seconds
      heartbeatFrequencyMS: 30000, // 30 seconds
    };

    console.log('[DB] Connection options:', JSON.stringify(options));

    // Connect to the database
    console.log('[DB][DEBUG] Calling mongoose.connect...');
    console.log('[DB][DEBUG] Connection attempt timestamp:', new Date().toISOString());
    const startTime = Date.now();
    
    try {
      const connection = await mongoose.connect(uri, options);
      const connectionTime = Date.now() - startTime;
      
      // Cache the connection
      cachedConnection = connection;
      connectionAttempts = 0; // Reset counter on successful connection
      
      console.log(`[DB][DEBUG] Connected to MongoDB successfully in ${connectionTime}ms`);
      console.log('[DB][DEBUG] Connection state after connect:', mongoose.connection.readyState);
      console.log('[DB][DEBUG] Connection ID:', mongoose.connection.id);
      
      // Log database information
      try {
        const admin = connection.connection.db.admin();
        const dbInfo = await admin.serverInfo();
        console.log(`[DB] MongoDB server version: ${dbInfo.version}`);
        
        // List collections
        const collections = await connection.connection.db.listCollections().toArray();
        console.log(`[DB] Available collections: ${collections.map(c => c.name).join(', ')}`);
      } catch (infoError) {
        console.log('[DB] Unable to retrieve detailed database info:', infoError.message);
      }
      
      // Set up connection event listeners for better debugging
      mongoose.connection.on('error', (err) => {
        console.error('[DB] Mongoose connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('[DB] Mongoose disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('[DB] Mongoose reconnected');
      });
      
      return connection;
    } catch (connectError) {
      console.error('[DB][DEBUG] Mongoose.connect error:', connectError);
      console.error('[DB][DEBUG] Mongoose.connect error name:', connectError.name);
      console.error('[DB][DEBUG] Mongoose.connect error message:', connectError.message);
      console.error('[DB][DEBUG] Mongoose.connect error stack:', connectError.stack);
      
      if (connectError.name === 'MongoServerSelectionError') {
        console.error('[DB][DEBUG] Server selection timed out. Possible causes:');
        console.error('[DB][DEBUG] - Network connectivity issues');
        console.error('[DB][DEBUG] - MongoDB Atlas IP whitelist restrictions');
        console.error('[DB][DEBUG] - Incorrect connection string');
      }
      
      throw connectError;
    }
  } catch (error) {
    console.error(`[DB] MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}):`, error);
    console.error('[DB] Error details:', error.stack);
    
    // Retry logic
    if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`[DB] Retrying connection in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectToDatabase(retryCount + 1);
    }
    
    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRY_ATTEMPTS} attempts: ${error.message}`);
  }
}

/**
 * Check if the database connection is healthy
 * @returns {Promise<boolean>} - True if connection is healthy
 */
export async function checkDatabaseConnection() {
  try {
    console.log('[DB] Checking database connection health...');
    
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      console.log('[DB] No active connection, attempting to connect...');
      await connectToDatabase();
    }
    
    // Try a simple operation to verify the connection
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    
    console.log('[DB] Database connection health check result:', result);
    return result.ok === 1;
  } catch (error) {
    console.error('[DB] Database health check failed:', error);
    return false;
  }
}
