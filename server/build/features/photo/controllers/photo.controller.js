"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoController = void 0;
const photo_service_1 = require("../services/photo.service");
class PhotoController {
    constructor() {
        this.uploadPhoto = async (req, res) => {
            try {
                if (!req.file) {
                    res.status(400).json({
                        error: 'No file provided',
                        message: 'Request must include a photo file'
                    });
                    return;
                }
                const result = await this.photoService.uploadPhoto(req.file);
                res.json(result);
            }
            catch (error) {
                console.error('[PhotoController] Upload error:', error);
                res.status(500).json({
                    error: 'Upload failed',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.deletePhoto = async (req, res) => {
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
            }
            catch (error) {
                console.error('[PhotoController] Delete error:', error);
                res.status(500).json({
                    error: 'Delete failed',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        };
        this.photoService = new photo_service_1.PhotoService();
    }
}
exports.PhotoController = PhotoController;
