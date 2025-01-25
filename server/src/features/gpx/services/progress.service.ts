import { EventEmitter } from 'events';

interface UploadProgress {
  status: 'processing' | 'complete' | 'error';
  progress: number;
  currentTask: string;
  errors?: string[];
}

class ProgressTracker extends EventEmitter {
  private progress: UploadProgress = {
    status: 'processing',
    progress: 0,
    currentTask: 'Initializing'
  };

  updateProgress(update: Partial<UploadProgress>) {
    this.progress = { ...this.progress, ...update };
    this.emit('progress', this.progress);
  }

  getProgress(): UploadProgress {
    return this.progress;
  }
}

export const createUploadProgressTracker = () => new ProgressTracker();
