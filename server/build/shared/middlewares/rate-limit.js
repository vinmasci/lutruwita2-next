"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatedRouteLimiter = exports.publicRouteLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const ioredis_1 = require("ioredis");
const server_config_1 = require("../config/server.config");
// Create Redis client for rate limiting
const redis = new ioredis_1.Redis(server_config_1.SERVER_CONFIG.redis.url);
// Handle Redis connection errors
redis.on('error', (error) => {
    console.error('[Redis Rate Limit Error]', error);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await redis.quit();
});
// Create Redis store with proper type handling
const createRedisStore = () => new rate_limit_redis_1.default({
    // Use the built-in Redis client command method
    sendCommand: async (...args) => {
        try {
            const [command, ...rest] = args;
            const result = await redis.call(command, ...rest);
            // Ensure we return a valid RedisReply type
            return typeof result === 'number' ? result : String(result);
        }
        catch (error) {
            console.error('[Redis Store Error]', error);
            return '';
        }
    },
    // Prefix keys to avoid collisions with cache
    prefix: 'rl:',
});
// Custom handler for rate limit exceeded
const handleRateLimitExceeded = (req, res) => {
    res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: res.getHeader('Retry-After')
    });
};
// Rate limit configuration for public routes
exports.publicRouteLimiter = (0, express_rate_limit_1.default)({
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
exports.authenticatedRouteLimiter = (0, express_rate_limit_1.default)({
    store: createRedisStore(),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per windowMs
    handler: handleRateLimitExceeded,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req) => {
        // Include user ID in key if available
        const userId = req.user?.id;
        const ip = req.headers['x-forwarded-for']?.toString() || req.ip || 'unknown';
        return userId ? `${ip}:${userId}` : ip;
    }
});
