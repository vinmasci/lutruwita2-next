import { Router } from 'express';
import { upload } from '../../../shared/middlewares/upload.middleware';
import { GPXController } from '../controllers/gpx.controller';

const router = Router();
const gpxController = new GPXController();

router.post('/upload', 
  upload.single('gpxFile'), 
  gpxController.uploadGPX
);

router.get('/progress/:uploadId', gpxController.getProgress);
router.get('/status/:uploadId', gpxController.getStatus);

export const gpxRoutes = router;
