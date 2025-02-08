import express, { Request, Response, NextFunction } from 'express';
import { RouteController } from '../controllers/route.controller';
import { auth } from '../../../shared/middlewares/auth.middleware';
import { validateRouteData } from '../../../shared/middlewares/validateRoute';
import { RequestWithAuth } from '../../../shared/types/auth.types';

const router = express.Router();
const controller = new RouteController();

// All routes require authentication
router.use(auth);

// Helper to bind controller methods with correct types
const asyncHandler = (fn: (req: RequestWithAuth, res: Response) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as RequestWithAuth, res)).catch(next);
  };

// Save a new route
router.post('/save', 
  validateRouteData,
  asyncHandler(controller.saveRoute.bind(controller))
);

// Update an existing route
router.put('/:id',
  validateRouteData,
  asyncHandler(controller.updateRoute.bind(controller))
);

// Get a specific route
router.get('/:id', asyncHandler(controller.loadRoute.bind(controller)));

// List routes with optional filters
router.get('/', asyncHandler(controller.listRoutes.bind(controller)));

// Delete a route
router.delete('/:id', asyncHandler(controller.deleteRoute.bind(controller)));

export default router;
