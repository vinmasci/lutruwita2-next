"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POIService = void 0;
const poi_model_1 = require("../models/poi.model");
class POIService {
    async getAllPOIs(userId) {
        return poi_model_1.POI.find({ userId });
    }
    async createPOI(userId, poiData) {
        const poi = new poi_model_1.POI({
            _id: poiData.id, // Use client-generated UUID as _id
            ...poiData,
            userId,
        });
        try {
            const savedPoi = await poi.save();
            return savedPoi;
        }
        catch (error) {
            console.error('Error creating POI:', error);
            throw error;
        }
    }
    async updatePOI(userId, id, updates) {
        const poi = await poi_model_1.POI.findOneAndUpdate({ _id: id, userId }, updates, { new: true, runValidators: true });
        if (!poi) {
            throw new Error('POI not found');
        }
        return poi;
    }
    async deletePOI(userId, id) {
        const poi = await poi_model_1.POI.findOneAndDelete({ _id: id, userId });
        if (!poi) {
            throw new Error('POI not found');
        }
        return poi;
    }
}
exports.POIService = POIService;
