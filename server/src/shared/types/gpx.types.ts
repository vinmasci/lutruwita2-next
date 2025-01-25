export interface ProcessedRoute {
  id: string;
  name: string;
  geojson: any;
  surface: SurfaceAnalysis;
  metadata: {
    distance: number;
    duration: number;
    elevation: number[];
  };
}

export type MapboxMatchResult = {
  geojson: any;
  distance: number;
  duration: number;
};

export type SurfaceAnalysis = {
  surfaceTypes: string[];
  confidence: number;
};
