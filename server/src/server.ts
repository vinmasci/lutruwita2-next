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

// Create required directories
import fs from 'fs';

const createDirectory = (dir: string, name: string) => {
  logger.info(`Attempting to create ${name} directory at:`, dir);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.chmodSync(dir, 0o777);
      logger.info(`Successfully created ${name} directory`);
    } else {
      const stats = fs.statSync(dir);
      if (!stats.isDirectory()) {
        throw new Error(`${name} path exists but is not a directory`);
      }
      fs.chmodSync(dir, 0o777);
      logger.info(`${name} directory already exists and has correct permissions`);
    }
  } catch (err) {
    logger.error(`Failed to create or verify ${name} directory:`, err);
    process.exit(1);
  }
};

// Create logs directory
const logDir = path.join(__dirname, '../../logs');
createDirectory(logDir, 'logs');

// Create uploads directory
const uploadsDir = path.join(__dirname, '../../uploads');
createDirectory(uploadsDir, 'uploads');

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
