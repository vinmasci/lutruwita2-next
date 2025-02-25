import Redis from 'ioredis';

// Cache the Redis connection
let cachedClient = null;

export function getRedisClient() {
  // If the connection is already established, return it
  if (cachedClient) {
    return cachedClient;
  }

  // Check for Redis URL
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    // Create a new Redis client with optimized options for serverless
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      // These options help with connection stability in serverless
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });

    // Handle connection errors
    client.on('error', (error) => {
      console.error('[Redis Error]', error);
    });

    // Cache the client
    cachedClient = client;
    
    console.log('Connected to Redis');
    return client;
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
}

// Cache utility functions
export async function getCache(key) {
  const client = getRedisClient();
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Redis Get Error]', error);
    return null;
  }
}

export async function setCache(key, data, expiryInSeconds) {
  const client = getRedisClient();
  try {
    await client.setex(key, expiryInSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[Redis Set Error]', error);
    return false;
  }
}

export async function deleteCache(key) {
  const client = getRedisClient();
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('[Redis Delete Error]', error);
    return false;
  }
}

export async function clearCacheByPattern(pattern) {
  const client = getRedisClient();
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
}

// Cache durations in seconds
export const CACHE_DURATIONS = {
  publicRoutes: 60 * 5, // 5 minutes
  routeData: 60 * 60 * 24, // 24 hours
  photos: 60 * 60 * 24 * 7 // 7 days
};
