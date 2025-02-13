import express, { Request, Response, NextFunction } from 'express';
import { PublicRouteController } from '../controllers/public-route.controller';

const router = express.Router();
const controller = new PublicRouteController();

// Helper to bind controller methods with correct types
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// List public routes with optional type filter
router.get('/', asyncHandler(controller.listPublicRoutes.bind(controller)));

// Get a specific public route
router.get('/:id', asyncHandler(controller.loadPublicRoute.bind(controller)));

export default router;
