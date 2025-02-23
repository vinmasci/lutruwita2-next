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
    } catch (error: unknown) {
      console.error('[PhotoController] Upload error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('invalid file type')) {
          res.status(400).json({
            error: 'Invalid file type',
            message: error.message
          });
          return;
        }
        
        if (errorMessage.includes('access denied') || errorMessage.includes('credentials')) {
          res.status(403).json({
            error: 'Authorization failed',
            message: error.message
          });
          return;
        }

        if (errorMessage.includes('bucket') && errorMessage.includes('not exist')) {
          res.status(503).json({
            error: 'Storage configuration error',
            message: error.message
          });
          return;
        }

        if (errorMessage.includes('failed to process image')) {
          res.status(422).json({
            error: 'Image processing failed',
            message: error.message
          });
          return;
        }
      }

      // Default error response
      res.status(500).json({
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred during upload'
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
    } catch (error: unknown) {
      console.error('[PhotoController] Delete error:', error);

      // Handle specific error types
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('invalid s3 url')) {
          res.status(400).json({
            error: 'Invalid URL',
            message: error.message
          });
          return;
        }

        if (errorMessage.includes('access denied') || errorMessage.includes('credentials')) {
          res.status(403).json({
            error: 'Authorization failed',
            message: error.message
          });
          return;
        }
      }

      // Default error response
      res.status(500).json({
        error: 'Delete failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred during deletion'
      });
    }
  };
}
