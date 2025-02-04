"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteController = void 0;
const route_service_js_1 = require("../services/route.service.js");
class RouteController {
    constructor() {
        this.routeService = new route_service_js_1.RouteService();
    }
    async saveRoute(req, res) {
        try {
            // Get user ID from Auth0 token
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Validate request body
            const { name, type, isPublic, mapState, routes, photos, pois, places } = req.body;
            if (!name || !type || typeof isPublic !== 'boolean') {
                return res.status(400).json({
                    error: 'Invalid request body',
                    details: 'name, type, and isPublic are required'
                });
            }
            if (!['tourism', 'event', 'bikepacking', 'single'].includes(type)) {
                return res.status(400).json({
                    error: 'Invalid route type',
                    details: 'type must be one of: tourism, event, bikepacking, single'
                });
            }
            // Validate mapState if provided
            if (mapState) {
                const { zoom, center, bearing, pitch } = mapState;
                if (typeof zoom !== 'number' || !Array.isArray(center) ||
                    typeof bearing !== 'number' || typeof pitch !== 'number') {
                    return res.status(400).json({
                        error: 'Invalid mapState',
                        details: 'mapState must include zoom, center, bearing, and pitch'
                    });
                }
            }
            const result = await this.routeService.saveRoute(userId, {
                name,
                type,
                isPublic,
                mapState,
                routes,
                photos,
                pois,
                places
            });
            res.status(201).json(result);
        }
        catch (error) {
            console.error('Save route error:', error);
            res.status(500).json({
                error: 'Failed to save route',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async loadRoute(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: 'Route ID is required'
                });
            }
            const result = await this.routeService.loadRoute(userId, id);
            res.json(result);
        }
        catch (error) {
            console.error('Load route error:', error);
            const routeError = error;
            res.status(routeError.message === 'Route not found' ? 404 : 500).json({
                error: 'Failed to load route',
                details: routeError.message || 'Unknown error'
            });
        }
    }
    async listRoutes(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { type, isPublic } = req.query;
            const filter = {};
            if (type && typeof type === 'string') {
                filter.type = type;
            }
            if (isPublic !== undefined) {
                filter.isPublic = isPublic === 'true';
            }
            const result = await this.routeService.listRoutes(userId, filter);
            res.json(result);
        }
        catch (error) {
            console.error('List routes error:', error);
            res.status(500).json({
                error: 'Failed to list routes',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async deleteRoute(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: 'Route ID is required'
                });
            }
            await this.routeService.deleteRoute(userId, id);
            res.status(204).send();
        }
        catch (error) {
            console.error('Delete route error:', error);
            const routeError = error;
            res.status(routeError.message === 'Route not found' ? 404 : 500).json({
                error: 'Failed to delete route',
                details: routeError.message || 'Unknown error'
            });
        }
    }
}
exports.RouteController = RouteController;
