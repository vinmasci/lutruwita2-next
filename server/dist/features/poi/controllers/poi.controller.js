"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POIController = void 0;
const poi_service_1 = require("../services/poi.service");
class POIController {
    constructor() {
        this.poiService = new poi_service_1.POIService();
    }
    async getPOIs(req, res) {
        try {
            const pois = await this.poiService.getPOIs();
            res.status(200).json(pois);
        }
        catch (error) {
            console.error('[POIController] Get POIs error:', error);
            res.status(500).json({ error: 'Failed to get POIs' });
        }
    }
    async savePOIs(req, res) {
        try {
            const savedPOIs = await this.poiService.savePOIs(req.body);
            res.status(200).json(savedPOIs);
        }
        catch (error) {
            console.error('[POIController] Save POIs error:', error);
            res.status(500).json({ error: 'Failed to save POIs' });
        }
    }
    async deleteAllPOIs(req, res) {
        try {
            await this.poiService.deleteAllPOIs();
            res.status(200).json({ message: 'All POIs deleted successfully' });
        }
        catch (error) {
            console.error('[POIController] Delete POIs error:', error);
            res.status(500).json({ error: 'Failed to delete POIs' });
        }
    }
}
exports.POIController = POIController;
