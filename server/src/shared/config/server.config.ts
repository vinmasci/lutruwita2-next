import path from 'path';

export const SERVER_CONFIG = {
    port: process.env.PORT || 3002, // Changed from 3001 to 3002
    uploadsDir: path.join(__dirname, '../../../../uploads'),
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['.gpx'],
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? 'https://your-production-domain.com' 
            : ['http://localhost:3000', 'http://localhost:3002'],
        credentials: true
    }
};
