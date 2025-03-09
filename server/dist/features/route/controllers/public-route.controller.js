"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicRouteController = void 0;
const route_service_1 = require("../services/route.service");
class PublicRouteController {
    constructor() {
        this.routeService = new route_service_1.RouteService();
    }
    async listPublicRoutes(req, res) {
        try {
            const { type } = req.query;
            const filter = {};
            if (type && typeof type === 'string') {
                filter.type = type;
            }
            const result = await this.routeService.listPublicRoutes(filter);
            res.json(result);
        }
        catch (error) {
            console.error('List public routes error:', error);
            res.status(500).json({
                error: 'Failed to list public routes',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async loadPublicRoute(req, res) {
        try {
            const { persistentId } = req.params;
            if (!persistentId) {
                return res.status(400).json({
                    error: 'Invalid request',
                    details: 'Route persistent ID is required'
                });
            }
            const result = await this.routeService.loadPublicRoute(persistentId);
            res.json(result);
        }
        catch (error) {
            console.error('Load public route error:', error);
            const status = error instanceof Error && error.message === 'Public route not found' ? 404 : 500;
            res.status(status).json({
                error: 'Failed to load public route',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.PublicRouteController = PublicRouteController;
