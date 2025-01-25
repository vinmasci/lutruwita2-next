export interface MapConfig {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export interface LayerConfig {
  id: string;
  type: 'tile' | 'vector';
  source: any;
  visible: boolean;
  zIndex: number;
}
