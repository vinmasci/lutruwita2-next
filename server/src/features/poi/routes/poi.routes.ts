import express, { Request, Response, NextFunction } from 'express';
import { POIController } from '../controllers/poi.controller';
import { auth } from '../../../shared/middlewares/auth.middleware';
import { RequestWithAuth } from '../../../shared/types/auth.types';

const router = express.Router();
const controller = new POIController();

// All routes require authentication
router.use(auth);

// Helper to bind controller methods with correct types
const asyncHandler = (fn: (req: RequestWithAuth, res: Response) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as RequestWithAuth, res)).catch(next);
  };

// Get all POIs
router.get('/', asyncHandler(controller.getAll.bind(controller)));

// Create a new POI
router.post('/', asyncHandler(controller.create.bind(controller)));

// Update a POI
router.put('/:id', asyncHandler(controller.update.bind(controller)));

// Delete a POI
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));

export default router;
