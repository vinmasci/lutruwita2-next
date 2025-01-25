import { Router } from 'express';
import multer from 'multer';
import { gpxController } from '../controllers/gpx.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/process', upload.single('file'), (req, res) => 
  gpxController.processGPX(req, res)
);

export default router;