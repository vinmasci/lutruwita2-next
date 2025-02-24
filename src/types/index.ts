export interface ProcessedRoute {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  gpxData: string;
  gpxFilePath?: string;
  segments: RouteSegment[];
  geojson: GeoJSON.FeatureCollection;
}

export interface RouteSegment {
  surface: string;
  distance: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface MapState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapRef {
  handleGpxUpload: (file: File) => Promise<void>;
  isReady: () => boolean;
  getCurrentRoutes: () => ProcessedRoute[];
  getCurrentPhotos: () => PhotoDocument[];
  getRouteData: () => GeoJSON.FeatureCollection;
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  getPitch: () => number;
  getBearing: () => number;
  getStyle: () => string;
  setViewState: (viewState: MapState) => void;
  clearRoutes: () => void;
  loadRoute: (route: ProcessedRoute) => Promise<void>;
}

export interface PhotoDocument {
  _id: string;
  url: string;
  originalName?: string;
  latitude: number;
  longitude: number;
  uploadedAt: string;
}
