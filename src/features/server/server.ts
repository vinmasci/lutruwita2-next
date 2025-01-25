import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/error-handling.ts';
import { authenticate } from './middlewares/auth.ts';
import gpxRoutes from '../gpx/routes/gpx.ts';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(authenticate);

// Routes
app.use('/api/gpx', gpxRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
