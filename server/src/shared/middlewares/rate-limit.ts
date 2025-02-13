import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import { SERVER_CONFIG } from '../config/server.config';
import { Request, Response } from 'express';

// Create Redis client for rate limiting
const redis = new Redis(SERVER_CONFIG.redis.url);

// Handle Redis connection errors
redis.on('error', (error: Error) => {
  console.error('[Redis Rate Limit Error]', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
});

import type { RedisReply } from 'rate-limit-redis';

// Create Redis store with proper type handling
const createRedisStore = () => new RedisStore({
  // Use the built-in Redis client command method
  sendCommand: async (...args: string[]): Promise<RedisReply> => {
    try {
      const [command, ...rest] = args;
      const result = await redis.call(command, ...rest);
      // Ensure we return a valid RedisReply type
      return typeof result === 'number' ? result : String(result);
    } catch (error) {
      console.error('[Redis Store Error]', error);
      return '';
    }
  },
  // Prefix keys to avoid collisions with cache
  prefix: 'rl:',
});

// Custom handler for rate limit exceeded
const handleRateLimitExceeded = (req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too many requests',
    message: 'Please try again later',
    retryAfter: res.getHeader('Retry-After')
  });
};

// Rate limit configuration for public routes
export const publicRouteLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  handler: handleRateLimitExceeded,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind a proxy, otherwise use IP
    const ip = req.headers['x-forwarded-for']?.toString() || req.ip;
    return ip || 'unknown';
  }
});

// More permissive rate limit for authenticated routes
export const authenticatedRouteLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  handler: handleRateLimitExceeded,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  keyGenerator: (req) => {
    // Include user ID in key if available
    const userId = (req as any).user?.id;
    const ip = req.headers['x-forwarded-for']?.toString() || req.ip || 'unknown';
    return userId ? `${ip}:${userId}` : ip;
  }
});
