"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_config_1 = require("./shared/config/server.config");
const gpx_routes_1 = require("./features/gpx/routes/gpx.routes");
const route_routes_1 = __importDefault(require("./features/route/routes/route.routes"));
const public_route_routes_1 = __importDefault(require("./features/route/routes/public-route.routes"));
const photo_routes_1 = require("./features/photo/routes/photo.routes");
const error_handling_1 = require("./shared/middlewares/error-handling");
require("dotenv/config");
const logger_config_1 = require("./shared/config/logger.config");
// Connect to MongoDB
mongoose_1.default.connect(process.env.MONGODB_URI)
    .then(() => {
    logger_config_1.logger.info('Connected to MongoDB');
})
    .catch((error) => {
    logger_config_1.logger.error('MongoDB connection error:', error);
    process.exit(1);
});
// Create required directories
const fs_1 = __importDefault(require("fs"));
const createDirectory = (dir, name) => {
    logger_config_1.logger.info(`Attempting to create ${name} directory at:`, dir);
    try {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
            fs_1.default.chmodSync(dir, 0o777);
            logger_config_1.logger.info(`Successfully created ${name} directory`);
        }
        else {
            const stats = fs_1.default.statSync(dir);
            if (!stats.isDirectory()) {
                throw new Error(`${name} path exists but is not a directory`);
            }
            fs_1.default.chmodSync(dir, 0o777);
            logger_config_1.logger.info(`${name} directory already exists and has correct permissions`);
        }
    }
    catch (err) {
        logger_config_1.logger.error(`Failed to create or verify ${name} directory:`, err);
        process.exit(1);
    }
};
// Create logs directory
const logDir = path_1.default.join(__dirname, '../../logs');
createDirectory(logDir, 'logs');
// Create uploads directory
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
createDirectory(uploadsDir, 'uploads');
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)(server_config_1.SERVER_CONFIG.cors));
app.use(express_1.default.json({ limit: '300mb' }));
app.use(express_1.default.urlencoded({ limit: '300mb', extended: true }));
app.use((0, morgan_1.default)('combined', { stream: { write: (message) => logger_config_1.logger.info(message.trim()) } }));
// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path_1.default.join(__dirname, '../../../dist');
    logger_config_1.logger.info(`Serving static files from: ${distPath}`);
    app.use(express_1.default.static(distPath));
}
// Health check endpoint for DigitalOcean App Platform
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
// API health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Add request logging middleware
app.use((req, res, next) => {
    logger_config_1.logger.info('Incoming Request:', {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        files: req.files
    });
    next();
});
// Feature Routes
app.use('/api/routes/public', public_route_routes_1.default); // Register public routes first
app.use('/api/gpx', gpx_routes_1.gpxRoutes);
app.use('/api/routes', route_routes_1.default);
app.use('/api/photos', photo_routes_1.photoRoutes);
// In production, serve the React app for any routes not matched by API routes
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../../../dist/index.html'));
    });
}
// Error handling
app.use(error_handling_1.errorHandler);
// Start server - listen on all interfaces for DigitalOcean App Platform
const port = typeof server_config_1.SERVER_CONFIG.port === 'string' ? parseInt(server_config_1.SERVER_CONFIG.port, 10) : server_config_1.SERVER_CONFIG.port;
app.listen(port, '0.0.0.0', () => {
    logger_config_1.logger.info(`Server running on port ${port} (0.0.0.0)`);
});
