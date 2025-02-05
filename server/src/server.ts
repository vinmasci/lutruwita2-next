import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import winston from 'winston';
import path from 'path';
import mongoose from 'mongoose';
import { SERVER_CONFIG } from './shared/config/server.config';
import { gpxRoutes } from './features/gpx/routes/gpx.routes';
import routeRoutes from './features/route/routes/route.routes';
import poiRoutes from './features/poi/routes/poi.routes';
import { errorHandler } from './shared/middlewares/error-handling';
import 'dotenv/config';

import { logger } from './shared/config/logger.config';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Add request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming Request:', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    files: req.files
  });
  next();
});

// Feature Routes
app.use('/api/gpx', gpxRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api', poiRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(SERVER_CONFIG.port, () => {
  logger.info(`Server running on port ${SERVER_CONFIG.port}`);
});
