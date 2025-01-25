"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPXController = void 0;
const gpx_service_1 = require("../services/gpx.service");
const progress_service_1 = require("../services/progress.service");
class GPXController {
    constructor() {
        this.uploadGPX = async (req, res) => {
            try {
                if (!req.file) {
                    res.status(400).json({ error: 'No file uploaded' });
                    return;
                }
                const uploadId = await this.gpxService.processGPXFile(req.file.path);
                res.json({ uploadId });
            }
            catch (error) {
                console.error('GPX Upload Error:', error);
                res.status(500).json({ error: 'Failed to process GPX file' });
            }
        };
        this.getProgress = async (req, res) => {
            const { uploadId } = req.params;
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const progressTracker = (0, progress_service_1.createUploadProgressTracker)();
            const onProgress = (progress) => {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
                if (progress.status === 'complete' || progress.status === 'error') {
                    progressTracker.removeListener('progress', onProgress);
                    res.end();
                }
            };
            progressTracker.on('progress', onProgress);
            // Handle client disconnect
            req.on('close', () => {
                progressTracker.removeListener('progress', onProgress);
            });
        };
        this.getStatus = async (req, res) => {
            const { uploadId } = req.params;
            const status = await this.gpxService.getUploadStatus(uploadId);
            res.json(status);
        };
        this.gpxService = new gpx_service_1.GPXService();
    }
}
exports.GPXController = GPXController;
