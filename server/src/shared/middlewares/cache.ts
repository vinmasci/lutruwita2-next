import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { SERVER_CONFIG } from '../config/server.config';

// Create Redis client for caching
const redis = new Redis(SERVER_CONFIG.redis.url);

// Handle Redis connection errors
redis.on('error', (error) => {
  console.error('[Redis Cache Error]', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
});

interface CacheOptions {
  duration: number; // Cache duration in seconds
  key?: string | ((req: Request) => string); // Custom key or key generator
}

export const cache = (options: CacheOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate cache key
      const key = typeof options.key === 'function'
        ? options.key(req)
        : options.key || `${req.method}:${req.originalUrl}`;

      // Try to get cached response
      const cachedResponse = await redis.get(key);
      if (cachedResponse) {
        const { statusCode, headers, data } = JSON.parse(cachedResponse) as {
          statusCode: number;
          headers: Record<string, string | number | string[]>;
          data: unknown;
        };
        
        // Set headers from cached response
        Object.entries(headers).forEach(([name, value]) => {
          res.setHeader(name, value);
        });

        // Send cached response
        return res.status(statusCode).json(data);
      }

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        // Cache the response
        const responseToCache = {
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          data
        };

        redis.setex(key, options.duration, JSON.stringify(responseToCache))
          .catch(error => console.error('[Redis Cache Set Error]', error));

        // Send the actual response
        return originalJson(data);
      };

      next();
    } catch (error) {
      // If Redis fails, continue without caching
      console.error('[Cache Middleware Error]', error);
      next();
    }
  };
};

// Helper to clear cache by pattern
export const clearCache = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys.map(k => k.toString()));
    }
  } catch (error) {
    console.error('[Clear Cache Error]', error);
  }
};

// Predefined cache durations from config
export const CACHE_DURATIONS = {
  publicRoutes: SERVER_CONFIG.redis.cacheExpiry.publicRoutes,
  routeData: SERVER_CONFIG.redis.cacheExpiry.routeData,
  photos: SERVER_CONFIG.redis.cacheExpiry.photos
};
