import multer from 'multer';
import { SERVER_CONFIG } from '../config/server.config';
import path from 'path';
import { Request } from 'express';
import { createUploadProgressTracker } from '../../features/gpx/services/progress.service';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SERVER_CONFIG.uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (SERVER_CONFIG.allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: SERVER_CONFIG.maxFileSize
  }
});
