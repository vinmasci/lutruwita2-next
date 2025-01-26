"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPXController = void 0;
const fs_1 = require("fs");
const gpx_service_1 = require("../services/gpx.service");
class GPXController {
    constructor() {
        this.uploadGPX = async (req, res) => {
            try {
                console.log('GPX upload request received', {
                    headers: req.headers,
                    file: req.file ? {
                        originalname: req.file.originalname,
                        size: req.file.size,
                        mimetype: req.file.mimetype
                    } : null
                });
                if (!req.file) {
                    console.warn('No file provided in upload request');
                    res.status(400).json({
                        error: 'Upload Error',
                        message: 'No file uploaded',
                        details: 'Request must include a file with field name "gpxFile"'
                    });
                    return;
                }
                // Verify file exists on disk
                try {
                    console.log('Verifying file exists on disk', { path: req.file.path });
                    await fs_1.promises.access(req.file.path);
                    console.log('File verified successfully');
                }
                catch (err) {
                    console.error('File verification failed', {
                        error: err,
                        path: req.file.path
                    });
                    res.status(500).json({
                        error: 'Upload Error',
                        message: 'File not saved correctly',
                        details: 'The uploaded file was not saved to disk properly'
                    });
                    return;
                }
                // Process the file and get upload ID
                console.log('Starting GPX file processing', { path: req.file.path });
                const uploadId = await this.gpxService.processGPXFile(req.file.path);
                if (!uploadId) {
                    console.error('Failed to generate upload ID');
                    res.status(500).json({
                        error: 'Processing Error',
                        message: 'No upload ID generated',
                        details: 'The server failed to generate an upload ID'
                    });
                    return;
                }
                console.log('GPX file processing started successfully', { uploadId });
                res.json({
                    uploadId,
                    message: 'File uploaded successfully',
                    filename: req.file.originalname
                });
            }
            catch (error) {
                console.error('GPX Upload Error:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const errorStack = error instanceof Error ? error.stack : '';
                res.status(500).json({
                    error: 'Processing Error',
                    message: 'Failed to process GPX file',
                    details: errorMessage,
                    ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
                });
            }
        };
        this.getProgress = async (req, res) => {
            const { uploadId } = req.params;
            const progressTracker = this.gpxService.getProgressTracker(uploadId);
            if (!progressTracker) {
                res.status(404).json({ error: 'Upload not found' });
                return;
            }
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const onProgress = (progress) => {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
                if (progress.status === 'complete' || progress.status === 'error') {
                    progressTracker.removeListener('progress', onProgress);
                    res.end();
                }
            };
            // Send initial progress
            const currentProgress = progressTracker.getProgress();
            res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);
            // Listen for future updates
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
        console.log('GPXController initialized');
    }
}
exports.GPXController = GPXController;
