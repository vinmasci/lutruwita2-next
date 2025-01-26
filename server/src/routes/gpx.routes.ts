import { Router } from 'express';
import multer from 'multer';
import { gpxController } from '../controllers/gpx.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Separate upload and progress endpoints
router.post('/upload', upload.single('gpxFile'), gpxController.uploadGPX);
router.get('/progress/:uploadId', gpxController.trackProgress);

export default router;
