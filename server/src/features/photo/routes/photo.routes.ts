import { Router } from 'express';
import multer from 'multer';
import { PhotoController } from '../controllers/photo.controller';
import { auth } from '../../../shared/middlewares/auth.middleware';

const router = Router();
const photoController = new PhotoController();

// Configure multer for memory storage (we'll process and send to S3)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Photo upload endpoint
router.post(
  '/upload',
  auth,
  upload.single('photo'),
  photoController.uploadPhoto
);

// Photo deletion endpoint
router.delete(
  '/delete',
  auth,
  photoController.deletePhoto
);

export const photoRoutes = router;
