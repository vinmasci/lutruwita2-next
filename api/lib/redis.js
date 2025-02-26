import Redis from 'ioredis';

// Cache the Redis connection
let cachedClient = null;

// Flag to track if Redis is available
let redisAvailable = true;

export function getRedisClient() {
  // If Redis is not available, return null immediately
  if (!redisAvailable) {
    return null;
  }

  // If the connection is already established, return it
  if (cachedClient) {
    return cachedClient;
  }

  // Check for Redis URL
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    // Create a new Redis client with optimized options for serverless
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
      // These options help with connection stability in serverless
      enableReadyCheck: false,
      enableOfflineQueue: false, // Disable offline queue to fail fast in serverless
      disconnectTimeout: 1000,
      keepAlive: 0, // Disable keepalive in serverless
      reconnectOnError: (err) => {
        // Only reconnect on specific errors
        const targetErrors = ['READONLY'];
        return targetErrors.includes(err.code);
      },
      retryStrategy: (times) => {
        // After 3 retries, mark Redis as unavailable
        if (times > 3) {
          redisAvailable = false;
          console.log('[Redis] Marking Redis as unavailable after multiple connection failures');
          return null; // Stop retrying
        }
        // Exponential backoff with a maximum of 2 seconds
        return Math.min(times * 100, 2000);
      }
    });

    // Handle connection errors
    client.on('error', (error) => {
      console.error('[Redis Error]', error);
      // Always mark Redis as unavailable on any error in serverless
      redisAvailable = false;
      console.log(`[Redis] Marking Redis as unavailable due to error: ${error.message}`);
      
      // In serverless, we should close the connection on error
      try {
        client.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    });
    
    // Handle reconnection
    client.on('reconnecting', () => {
      console.log('[Redis] Attempting to reconnect...');
    });
    
    // Handle successful connection
    client.on('connect', () => {
      console.log('[Redis] Connected successfully');
      redisAvailable = true;
    });

    // Cache the client
    cachedClient = client;
    
    console.log('Connected to Redis');
    return client;
  } catch (error) {
    console.error('Redis connection error:', error);
    redisAvailable = false;
    console.log('[Redis] Marking Redis as unavailable due to connection error');
    return null;
  }
}

// Cache utility functions
export async function getCache(key) {
  try {
    const client = getRedisClient();
    // Check if client is null (Redis unavailable)
    if (!client) {
      console.log('[Redis] Cache unavailable, skipping getCache operation');
      return null;
    }
    
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Redis Get Error]', error);
      // If Redis fails, we'll return null and let the application fall back to the database
      return null;
    }
  } catch (connectionError) {
    // Handle connection errors gracefully
    console.error('[Redis Connection Error]', connectionError);
    return null;
  }
}

export async function setCache(key, data, expiryInSeconds) {
  try {
    const client = getRedisClient();
    // Check if client is null (Redis unavailable)
    if (!client) {
      console.log('[Redis] Cache unavailable, skipping setCache operation');
      return false;
    }
    
    try {
      await client.setex(key, expiryInSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[Redis Set Error]', error);
      return false;
    }
  } catch (connectionError) {
    // Handle connection errors gracefully
    console.error('[Redis Connection Error]', connectionError);
    return false;
  }
}

export async function deleteCache(key) {
  try {
    const client = getRedisClient();
    // Check if client is null (Redis unavailable)
    if (!client) {
      console.log('[Redis] Cache unavailable, skipping deleteCache operation');
      return false;
    }
    
    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('[Redis Delete Error]', error);
      return false;
    }
  } catch (connectionError) {
    // Handle connection errors gracefully
    console.error('[Redis Connection Error]', connectionError);
    return false;
  }
}

export async function clearCacheByPattern(pattern) {
  try {
    const client = getRedisClient();
    // Check if client is null (Redis unavailable)
    if (!client) {
      console.log('[Redis] Cache unavailable, skipping clearCacheByPattern operation');
      return false;
    }
    
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('[Redis Clear Cache Error]', error);
      return false;
    }
  } catch (connectionError) {
    // Handle connection errors gracefully
    console.error('[Redis Connection Error]', connectionError);
    return false;
  }
}

// Cache durations in seconds
export const CACHE_DURATIONS = {
  publicRoutes: 60 * 5, // 5 minutes
  routeData: 60 * 60 * 24, // 24 hours
  photos: 60 * 60 * 24 * 7 // 7 days
};
