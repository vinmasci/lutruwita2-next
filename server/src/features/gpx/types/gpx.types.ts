export interface UploadStatus {
  status: 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  elevation?: number;
  time?: Date;
}

export interface TrackSegment {
  points: TrackPoint[];
  surface?: SurfaceType;
}

export interface Track {
  name?: string;
  segments: TrackSegment[];
}

export interface GPXFile {
  tracks: Track[];
  metadata?: {
    name?: string;
    description?: string;
    time?: Date;
  };
}

export type SurfaceType = {
  type: string;
  rating: number; // 0-6 scale
  color: string;
};
