"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_DURATIONS = exports.clearCache = exports.cache = void 0;
const ioredis_1 = require("ioredis");
const server_config_1 = require("../config/server.config");
// Create Redis client for caching
const redis = new ioredis_1.Redis(server_config_1.SERVER_CONFIG.redis.url);
// Handle Redis connection errors
redis.on('error', (error) => {
    console.error('[Redis Cache Error]', error);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await redis.quit();
});
const cache = (options) => {
    return async (req, res, next) => {
        try {
            // Generate cache key
            const key = typeof options.key === 'function'
                ? options.key(req)
                : options.key || `${req.method}:${req.originalUrl}`;
            // Try to get cached response
            const cachedResponse = await redis.get(key);
            if (cachedResponse) {
                const { statusCode, headers, data } = JSON.parse(cachedResponse);
                // Set headers from cached response
                Object.entries(headers).forEach(([name, value]) => {
                    res.setHeader(name, value);
                });
                // Send cached response
                return res.status(statusCode).json(data);
            }
            // Store original res.json to intercept response
            const originalJson = res.json.bind(res);
            res.json = (data) => {
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
        }
        catch (error) {
            // If Redis fails, continue without caching
            console.error('[Cache Middleware Error]', error);
            next();
        }
    };
};
exports.cache = cache;
// Helper to clear cache by pattern
const clearCache = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys.map(k => k.toString()));
        }
    }
    catch (error) {
        console.error('[Clear Cache Error]', error);
    }
};
exports.clearCache = clearCache;
// Predefined cache durations from config
exports.CACHE_DURATIONS = {
    publicRoutes: server_config_1.SERVER_CONFIG.redis.cacheExpiry.publicRoutes,
    routeData: server_config_1.SERVER_CONFIG.redis.cacheExpiry.routeData,
    photos: server_config_1.SERVER_CONFIG.redis.cacheExpiry.photos
};
