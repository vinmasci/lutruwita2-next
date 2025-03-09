"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_CONFIG = void 0;
const path_1 = __importDefault(require("path"));
exports.SERVER_CONFIG = {
    port: process.env.PORT || 8080,
    uploadsDir: process.env.NODE_ENV === 'production' ? '/tmp/uploads' : path_1.default.join(__dirname, '../../../../uploads'),
    maxFileSize: 100 * 1024 * 1024, // 100MB for photos
    allowedFileTypes: ['.gpx', '.jpg', '.jpeg', '.png', '.heic'],
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? 'https://your-production-domain.com'
            : ['http://localhost:3000'],
        credentials: true
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        cacheExpiry: {
            publicRoutes: 60 * 5, // 5 minutes
            routeData: 60 * 60 * 24, // 24 hours
            photos: 60 * 60 * 24 * 7 // 7 days
        }
    }
};
