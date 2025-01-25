import express from 'express';
import cors from 'cors';
import { SERVER_CONFIG } from './shared/config/server.config';
import { gpxRoutes } from './features/gpx/routes/gpx.routes';
import { errorHandler } from './shared/middlewares/error-handling';
import 'dotenv/config';

const app = express();

// Middleware
app.use(cors(SERVER_CONFIG.cors));
app.use(express.json());

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
  console.log(`Server running on port ${SERVER_CONFIG.port}`);
});
