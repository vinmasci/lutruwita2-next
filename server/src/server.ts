import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import winston from 'winston';
import path from 'path';
import { SERVER_CONFIG } from './shared/config/server.config';
import { gpxRoutes } from './features/gpx/routes/gpx.routes';
import { errorHandler } from './shared/middlewares/error-handling';
import 'dotenv/config';

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/server.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      handleExceptions: true,
      handleRejections: true
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/rejections.log')
    })
  ]
});

// Add transport error handling
logger.transports.forEach(transport => {
  if (transport instanceof winston.transports.File) {
    transport.on('error', (error) => {
      console.error('File transport error:', error);
    });
  }
});

// Handle Winston transport errors
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logDir = path.join(__dirname, '../../logs');
logger.info('Attempting to create logs directory at:', logDir);
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    // Set permissions to allow read/write for all users
    fs.chmodSync(logDir, 0o777);
    logger.info('Successfully created logs directory');
  } else {
    // Verify directory permissions
    const stats = fs.statSync(logDir);
    if (!stats.isDirectory()) {
      throw new Error('Logs path exists but is not a directory');
    }
    // Ensure write permissions
    fs.chmodSync(logDir, 0o777);
    logger.info('Logs directory already exists and has correct permissions');
  }
} catch (err) {
  logger.error('Failed to create or verify logs directory:', err);
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors(SERVER_CONFIG.cors));
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Feature Routes
app.use('/api/gpx', gpxRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(SERVER_CONFIG.port, () => {
  logger.info(`Server running on port ${SERVER_CONFIG.port}`);
});
