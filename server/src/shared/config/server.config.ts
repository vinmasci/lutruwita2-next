import path from 'path';

export const SERVER_CONFIG = {
    port: process.env.PORT || 8080,
    uploadsDir: path.join(__dirname, '../../../../uploads'),
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
