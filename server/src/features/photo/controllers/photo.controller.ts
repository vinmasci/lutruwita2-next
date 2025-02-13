import { Request, Response } from 'express';
import { PhotoService } from '../services/photo.service';

export class PhotoController {
  private photoService: PhotoService;

  constructor() {
    this.photoService = new PhotoService();
  }

  uploadPhoto = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: 'No file provided',
          message: 'Request must include a photo file'
        });
        return;
      }

      const result = await this.photoService.uploadPhoto(req.file as Express.Multer.File);
      res.json(result);
    } catch (error) {
      console.error('[PhotoController] Upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deletePhoto = async (req: Request, res: Response): Promise<void> => {
    try {
      const { url } = req.body;
      if (!url) {
        res.status(400).json({
          error: 'No URL provided',
          message: 'Request must include the photo URL to delete'
        });
        return;
      }

      await this.photoService.deletePhoto(url);
      res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
      console.error('[PhotoController] Delete error:', error);
      res.status(500).json({
        error: 'Delete failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
