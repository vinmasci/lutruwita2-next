"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteController = void 0;
const route_service_1 = require("../services/route.service");
class RouteController {
    constructor() {
        this.routeService = new route_service_1.RouteService();
    }
    async updateRoute(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    details: 'User ID not found'
                });
            }
            const { persistentId } = req.params;
            if (!persistentId) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: 'Route persistent ID is required'
                });
            }
            console.log('[RouteController] Starting route update...', { persistentId });
            const { name, type, isPublic, mapState, routes, photos, pois } = req.body;
            // Validate mapState if provided
            if (mapState) {
                const { zoom, center, bearing, pitch } = mapState;
                if (typeof zoom !== 'number' || !Array.isArray(center) ||
                    typeof bearing !== 'number' || typeof pitch !== 'number') {
                    return res.status(400).json({
                        error: 'Invalid route data',
                        details: 'mapState must include valid zoom, center, bearing, and pitch values'
                    });
                }
            }
            const routeToUpdate = {
                name,
                type,
                isPublic,
                userId,
                updatedAt: new Date().toISOString(),
                mapState,
                routes,
                photos,
                pois,
            };
            console.log('[RouteController] Updating route in database...');
            const result = await this.routeService.saveRoute(userId, routeToUpdate, persistentId);
            console.log('[RouteController] Route updated successfully');
            res.json(result);
        }
        catch (error) {
            console.error('[RouteController] Update route error:', error);
            const routeError = error;
            const status = routeError.message === 'Route not found or access denied' ? 404 : 500;
            res.status(status).json({
                error: 'Failed to update route',
                details: routeError.message || 'Unknown error'
            });
        }
    }
    async saveRoute(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    details: 'User ID not found'
                });
            }
            console.log('[RouteController] Starting save route...');
            const { name, type, isPublic, mapState, routes, photos, pois } = req.body;
            console.log('[RouteController] POIs received:', {
                draggable: pois?.draggable?.length || 0,
                places: pois?.places?.length || 0
            });
            console.log('[RouteController] Full POI data:', pois);
            // Validate mapState if provided
            if (mapState) {
                const { zoom, center, bearing, pitch } = mapState;
                if (typeof zoom !== 'number' || !Array.isArray(center) ||
                    typeof bearing !== 'number' || typeof pitch !== 'number') {
                    return res.status(400).json({
                        error: 'Invalid route data',
                        details: 'mapState must include valid zoom, center, bearing, and pitch values'
                    });
                }
            }
            // Add timestamps and user data
            const routeToSave = {
                name,
                type,
                isPublic,
                userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                mapState,
                routes,
                photos,
                pois,
            };
            console.log('[RouteController] Saving route to database...');
            const result = await this.routeService.saveRoute(userId, routeToSave);
            console.log('[RouteController] Route saved successfully. Result:', result);
            console.log('[RouteController] POIs have been saved to MongoDB');
            res.status(201).json(result);
        }
        catch (error) {
            console.error('[RouteController] Save route error:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                routeCount: req.body.routes?.length,
                dataSize: JSON.stringify(req.body).length / 1024 / 1024 + 'MB'
            });
            // Log validation errors if present
            if (error instanceof Error && 'errors' in error) {
                console.error('[RouteController] Validation errors:', error.errors);
            }
            res.status(500).json({
                error: 'Failed to save route',
                details: error instanceof Error ? error.message : 'Unknown error',
                validationErrors: error instanceof Error && 'errors' in error ? error.errors : undefined
            });
        }
    }
    async loadRoute(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { persistentId } = req.params;
            if (!persistentId) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: 'Route persistent ID is required'
                });
            }
            const result = await this.routeService.loadRoute(userId, persistentId);
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
            const { persistentId } = req.params;
            if (!persistentId) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: 'Route persistent ID is required'
                });
            }
            await this.routeService.deleteRoute(userId, persistentId);
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
