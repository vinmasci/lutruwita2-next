import { Map } from 'ol';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorTileLayer from 'ol/layer/VectorTile';
import OSM from 'ol/source/OSM';
import VectorTileSource from 'ol/source/VectorTile';
import { fromLonLat } from 'ol/proj';
import MVT from 'ol/format/MVT';
import { MapConfig } from '../types/map.types';

export const DEFAULT_MAP_CONFIG: MapConfig = {
  center: [146.5, -42.0], // Tasmania coordinates
  zoom: 7,
  minZoom: 5,
  maxZoom: 18
};

export function createMap(target: HTMLElement, config: MapConfig = DEFAULT_MAP_CONFIG) {
  const map = new Map({
    target,
    layers: [
      new TileLayer({
        source: new OSM()
      })
    ],
    view: new View({
      center: fromLonLat(config.center),
      zoom: config.zoom,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom
    })
  });

  // Add MapTiler roads layer
  const roadsLayer = new VectorTileLayer({
    source: new VectorTileSource({
      format: new MVT(),
      url: `https://api.maptiler.com/tiles/5dd3666f-1ce4-4df6-9146-eda62a200bcb/{z}/{x}/{y}.pbf?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      minZoom: 12,
      maxZoom: 14
    }),
    properties: {
      id: 'australia-roads'  // This is important for querying later
    }
  });

  map.addLayer(roadsLayer);

  return map;
}
