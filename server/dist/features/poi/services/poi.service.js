"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POIService = void 0;
const poi_model_1 = require("../models/poi.model");
class POIService {
    async getPOIs() {
        try {
            console.log('[POIService] Getting all POIs...');
            const allPois = await poi_model_1.POIModel.find({});
            const draggablePOIs = [];
            const placePOIs = [];
            for (const poi of allPois) {
                const doc = poi.toObject();
                // Skip invalid POIs
                if (!Array.isArray(doc.coordinates) || doc.coordinates.length !== 2 || !doc.name || !doc.category || !doc.icon) {
                    continue;
                }
                const photos = (doc.photos || [])
                    .filter(photo => photo && typeof photo.url === 'string')
                    .map(photo => ({
                    url: photo.url,
                    caption: typeof photo.caption === 'string' ? photo.caption : undefined
                }));
                const style = doc.style ? {
                    color: typeof doc.style.color === 'string' ? doc.style.color : undefined,
                    size: typeof doc.style.size === 'number' ? doc.style.size : undefined
                } : undefined;
                const basePOI = {
                    id: poi._id.toString(),
                    coordinates: doc.coordinates,
                    name: doc.name,
                    description: typeof doc.description === 'string' ? doc.description : undefined,
                    category: doc.category,
                    icon: doc.icon,
                    photos,
                    style
                };
                if (doc.type === 'draggable') {
                    draggablePOIs.push({
                        ...basePOI,
                        type: 'draggable'
                    });
                }
                else if (doc.type === 'place' && typeof doc.placeId === 'string') {
                    placePOIs.push({
                        ...basePOI,
                        type: 'place',
                        placeId: doc.placeId
                    });
                }
            }
            return { draggable: draggablePOIs, places: placePOIs };
        }
        catch (error) {
            console.error('[POIService] Failed to get POIs:', error);
            throw error;
        }
    }
    async savePOIs(pois) {
        try {
            console.log('[POIService] Starting POI save process...');
            // Save and collect draggable POIs
            const savedDraggable = await Promise.all(pois.draggable.map(async (poi) => {
                const poiDoc = new poi_model_1.POIModel({
                    coordinates: poi.coordinates,
                    name: poi.name,
                    description: poi.description,
                    category: poi.category,
                    icon: poi.icon,
                    photos: poi.photos,
                    style: poi.style,
                    type: 'draggable'
                });
                const saved = await poiDoc.save();
                return { ...poi, id: saved._id.toString() };
            }));
            // Save and collect place POIs
            const savedPlaces = await Promise.all(pois.places.map(async (poi) => {
                if (poi.type !== 'place') {
                    throw new Error('Invalid POI type in places array');
                }
                const poiDoc = new poi_model_1.POIModel({
                    coordinates: poi.coordinates,
                    name: poi.name,
                    description: poi.description,
                    category: poi.category,
                    icon: poi.icon,
                    photos: poi.photos,
                    style: poi.style,
                    type: 'place',
                    placeId: poi.placeId
                });
                const saved = await poiDoc.save();
                return { ...poi, id: saved._id.toString() };
            }));
            console.log('[POIService] POIs saved successfully');
            return {
                draggable: savedDraggable,
                places: savedPlaces
            };
        }
        catch (error) {
            console.error('[POIService] Failed to save POIs:', error);
            throw error;
        }
    }
    async deleteAllPOIs() {
        try {
            await poi_model_1.POIModel.deleteMany({});
            console.log('[POIService] All POIs deleted successfully');
        }
        catch (error) {
            console.error('[POIService] Failed to delete POIs:', error);
            throw error;
        }
    }
}
exports.POIService = POIService;
