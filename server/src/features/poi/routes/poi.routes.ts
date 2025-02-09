import { Router } from 'express';
import { POIController } from '../controllers/poi.controller';
import { auth } from '../../../shared/middlewares/auth.middleware';

const router = Router();
const poiController = new POIController();

// Get all POIs
router.get('/', auth, (req, res) => poiController.getPOIs(req, res));

// Save POIs
router.post('/', auth, (req, res) => poiController.savePOIs(req, res));

// Delete all POIs
router.delete('/', auth, (req, res) => poiController.deleteAllPOIs(req, res));

export default router;
