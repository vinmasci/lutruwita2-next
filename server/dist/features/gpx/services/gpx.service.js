"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPXService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const gpx_processing_1 = require("../../../services/gpx/gpx.processing");
const progress_service_1 = require("./progress.service");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class GPXService {
    constructor() {
        this.progressTrackers = new Map();
        const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
        if (!mapboxToken) {
            throw new Error('MAPBOX_ACCESS_TOKEN environment variable is required');
        }
        this.gpxProcessor = new gpx_processing_1.GPXProcessingService(mapboxToken);
    }
    async processGPXFile(filePath) {
        // Generate a unique upload ID
        const uploadId = `upload_${Date.now()}`;
        try {
            // Create progress tracker for this upload
            const progressTracker = (0, progress_service_1.createUploadProgressTracker)();
            this.progressTrackers.set(uploadId, progressTracker);
            // Verify file exists
            await promises_1.default.access(filePath);
            // Initialize progress
            progressTracker.updateProgress({
                status: 'processing',
                progress: 0,
                currentTask: 'Starting GPX processing'
            });
            // Read and process GPX file
            const fileContent = await promises_1.default.readFile(filePath, 'utf-8');
            const result = await this.gpxProcessor.processGPXFile(fileContent, {
                onProgress: (progress) => {
                    progressTracker.updateProgress({
                        status: 'processing',
                        progress,
                        currentTask: 'Processing GPX file'
                    });
                }
            });
            // Update progress to complete
            progressTracker.updateProgress({
                status: 'complete',
                progress: 100,
                currentTask: 'GPX processing complete',
                result
            });
            return uploadId;
        }
        catch (error) {
            console.error('Error processing GPX file:', error);
            const progressTracker = this.progressTrackers.get(uploadId);
            if (progressTracker) {
                progressTracker.updateProgress({
                    status: 'error',
                    progress: 0,
                    currentTask: 'Processing failed',
                    errors: [error instanceof Error ? error.message : 'Unknown error']
                });
            }
            throw error;
        }
    }
    getProgressTracker(uploadId) {
        return this.progressTrackers.get(uploadId);
    }
    async getUploadStatus(uploadId) {
        const tracker = this.progressTrackers.get(uploadId);
        if (!tracker) {
            return {
                status: 'error',
                progress: 0,
                message: 'Upload not found'
            };
        }
        const progress = tracker.getProgress();
        return {
            status: progress.status,
            progress: progress.progress,
            message: progress.currentTask
        };
    }
}
exports.GPXService = GPXService;
