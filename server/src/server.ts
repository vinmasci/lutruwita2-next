import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import winston from 'winston';
import path from 'path';
import mongoose from 'mongoose';
import { SERVER_CONFIG } from './shared/config/server.config';
import { gpxRoutes } from './features/gpx/routes/gpx.routes';
import routeRoutes from './features/route/routes/route.routes';
import publicRouteRoutes from './features/route/routes/public-route.routes';
import { photoRoutes } from './features/photo/routes/photo.routes';
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
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ limit: '300mb', extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../../dist');
  logger.info(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
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
app.use('/api/routes/public', publicRouteRoutes); // Register public routes first
app.use('/api/gpx', gpxRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/photos', photoRoutes);

// In production, serve the React app for any routes not matched by API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../../dist/index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server - listen on all interfaces for DigitalOcean App Platform
const port = typeof SERVER_CONFIG.port === 'string' ? parseInt(SERVER_CONFIG.port, 10) : SERVER_CONFIG.port;
app.listen(port, '0.0.0.0', () => {
  logger.info(`Server running on port ${port} (0.0.0.0)`);
});
