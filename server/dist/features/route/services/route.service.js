"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteService = void 0;
const route_model_1 = require("../models/route.model");
const mongoose_1 = __importDefault(require("mongoose"));
class RouteService {
    async saveRoute(userId, data) {
        try {
            const routeId = new mongoose_1.default.Types.ObjectId().toString();
            console.log('[RouteService] Saving route with POIs:', data.pois);
            // Extract POI IDs for storage - use the same ID that's used as MongoDB _id
            const pois = {
                draggable: data.pois?.draggable || [],
                places: data.pois?.places || []
            };
            console.log('[RouteService] Storing POI references:', pois);
            const route = new route_model_1.RouteModel({
                id: routeId,
                userId,
                name: data.name,
                type: data.type,
                isPublic: data.isPublic,
                mapState: data.mapState,
                routes: data.routes || [],
                photos: data.photos || [],
                pois,
                places: data.places || []
            });
            console.log('[RouteService] Route model before save:', route.toObject());
            const savedRoute = await route.save();
            console.log('[RouteService] Saved route:', savedRoute.toObject());
            return {
                id: routeId,
                message: 'Route saved successfully'
            };
        }
        catch (error) {
            throw new Error(`Failed to save route: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async loadRoute(userId, routeId) {
        try {
            const route = await route_model_1.RouteModel.findOne({ id: routeId });
            if (!route) {
                throw new Error('Route not found');
            }
            // Check if user has access to this route
            if (route.userId !== userId && !route.isPublic) {
                throw new Error('Access denied');
            }
            // Get route data
            const routeData = route.toJSON();
            console.log('[RouteService] Loading route with POI references:', routeData.pois);
            // Fetch full POI data
            const poiIds = [...routeData.pois.draggable, ...routeData.pois.places];
            console.log('[RouteService] Fetching POIs with IDs:', poiIds);
            const pois = await mongoose_1.default.model('POI').find({ _id: { $in: poiIds } });
            console.log('[RouteService] Found POIs:', pois);
            // Reconstruct POIs structure using _id since we're using client-generated UUIDs as MongoDB _id
            const poiMap = new Map(pois.map(poi => [poi._id.toString(), poi]));
            console.log('[RouteService] POI Map:', Array.from(poiMap.entries()));
            const reconstructedPois = {
                draggable: routeData.pois.draggable.map(id => {
                    const poi = poiMap.get(id);
                    if (!poi)
                        console.log('[RouteService] Missing POI for ID:', id);
                    return poi;
                }).filter(Boolean),
                places: routeData.pois.places.map(id => {
                    const poi = poiMap.get(id);
                    if (!poi)
                        console.log('[RouteService] Missing POI for ID:', id);
                    return poi;
                }).filter(Boolean)
            };
            console.log('[RouteService] Reconstructed POIs:', reconstructedPois);
            return {
                route: {
                    ...routeData,
                    pois: reconstructedPois
                },
                message: 'Route loaded successfully'
            };
        }
        catch (error) {
            throw new Error(`Failed to load route: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async listRoutes(userId, filter) {
        try {
            const query = {};
            // If type filter is provided
            if (filter?.type) {
                query.type = filter.type;
            }
            // If isPublic filter is provided
            if (typeof filter?.isPublic === 'boolean') {
                query.isPublic = filter.isPublic;
            }
            // Show user's own routes and public routes
            query.$or = [
                { userId },
                { isPublic: true }
            ];
            const routes = await route_model_1.RouteModel.find(query)
                .select('id name type isPublic createdAt updatedAt')
                .sort({ createdAt: -1 });
            return {
                routes: routes.map(route => ({
                    id: route.id,
                    name: route.name,
                    type: route.type,
                    isPublic: route.isPublic,
                    createdAt: route.createdAt,
                    updatedAt: route.updatedAt
                }))
            };
        }
        catch (error) {
            throw new Error(`Failed to list routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteRoute(userId, routeId) {
        try {
            const route = await route_model_1.RouteModel.findOne({ id: routeId });
            if (!route) {
                throw new Error('Route not found');
            }
            // Only allow deletion if user owns the route
            if (route.userId !== userId) {
                throw new Error('Access denied');
            }
            await route_model_1.RouteModel.deleteOne({ id: routeId });
        }
        catch (error) {
            throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.RouteService = RouteService;
