import { Map } from 'ol';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
export const DEFAULT_MAP_CONFIG = {
    center: [146.5, -42.0], // Tasmania coordinates
    zoom: 7,
    minZoom: 5,
    maxZoom: 18
};
export function createMap(target, config = DEFAULT_MAP_CONFIG) {
    return new Map({
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
}
