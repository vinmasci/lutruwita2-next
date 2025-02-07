import { Router } from 'express';
import { POIController } from '../controllers/poi.controller';
import { auth } from '../../../shared/middlewares/auth.middleware';

const router = Router();
const poiController = new POIController();

// Delete POIs
router.delete('/', auth, (req, res) => poiController.deletePOIs(req, res));

export default router;
