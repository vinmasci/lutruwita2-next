"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRouteData = void 0;
const validateRouteData = (req, res, next) => {
    try {
        const { name, type, routes, isPublic } = req.body;
        if (!name || typeof name !== 'string') {
            res.status(400).json({
                error: 'Invalid route data',
                details: 'Name is required and must be a string'
            });
            return;
        }
        if (!type || !['tourism', 'event', 'bikepacking', 'single'].includes(type)) {
            res.status(400).json({
                error: 'Invalid route data',
                details: 'Type must be one of: tourism, event, bikepacking, single'
            });
            return;
        }
        if (!routes || !Array.isArray(routes) || routes.length === 0) {
            res.status(400).json({
                error: 'Invalid route data',
                details: 'No route data provided'
            });
            return;
        }
        if (typeof isPublic !== 'boolean') {
            res.status(400).json({
                error: 'Invalid route data',
                details: 'isPublic must be a boolean'
            });
            return;
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.validateRouteData = validateRouteData;
