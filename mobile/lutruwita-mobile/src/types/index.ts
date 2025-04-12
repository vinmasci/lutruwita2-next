/**
 * Common types for the Lutruwita Mobile app
 */

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isPremium: boolean;
}

// Map types
export interface MapData {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  isPremium: boolean;
  price?: number;
  thumbnailUrl?: string;
  downloadUrl?: string;
  isDownloaded?: boolean;
  downloadedAt?: string;
  size?: number; // in bytes
}

// Route types
export interface RouteData {
  id: string;
  mapId: string;
  name: string;
  description?: string;
  distance: number; // in meters
  elevation: number; // in meters
  duration: number; // in seconds
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  coordinates: Coordinate[];
  photos?: Photo[];
  pointsOfInterest?: PointOfInterest[];
}

export interface Coordinate {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: string;
}

// Photo types
export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  takenAt?: string;
  coordinate?: Coordinate;
}

// Point of Interest types
export interface PointOfInterest {
  id: string;
  name: string;
  description?: string;
  type: 'viewpoint' | 'water' | 'camping' | 'shelter' | 'danger' | 'other';
  coordinate: Coordinate;
  photos?: Photo[];
}

// App state types
export interface AppState {
  isOnline: boolean;
  isAuthenticated: boolean;
  user?: User;
  downloadProgress?: {
    mapId: string;
    progress: number; // 0-100
    bytesDownloaded: number;
    totalBytes: number;
  };
}
