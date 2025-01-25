"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadProgressTracker = void 0;
const events_1 = require("events");
class ProgressTracker extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.progress = {
            status: 'processing',
            progress: 0,
            currentTask: 'Initializing'
        };
    }
    updateProgress(update) {
        this.progress = { ...this.progress, ...update };
        this.emit('progress', this.progress);
    }
    getProgress() {
        return this.progress;
    }
}
const createUploadProgressTracker = () => new ProgressTracker();
exports.createUploadProgressTracker = createUploadProgressTracker;
