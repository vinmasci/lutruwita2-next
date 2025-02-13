"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteService = void 0;
const route_model_1 = require("../models/route.model");
class RouteService {
    async saveRoute(userId, data, routeId) {
        try {
            console.log('[RouteService] Starting route save process...', {
                routeCount: data.routes?.length,
                dataSize: JSON.stringify(data).length / 1024 / 1024 + 'MB',
                userId,
                routeId
            });
            // Log details about each route
            data.routes?.forEach((route, index) => {
                console.log(`[RouteService] Route ${index + 1} details:`, {
                    name: route.name,
                    pointCount: route.geojson?.features[0]?.geometry?.type === 'LineString'
                        ? route.geojson.features[0].geometry.coordinates.length
                        : undefined,
                    surfaceTypesCount: route.surface?.surfaceTypes?.length,
                    elevationPointsCount: route.surface?.elevationProfile?.length,
                    unpavedSectionsCount: route.unpavedSections?.length,
                    geojsonSize: route.geojson ? JSON.stringify(route.geojson).length / 1024 + 'KB' : '0KB'
                });
            });
            console.log('[RouteService] Preparing route data...');
            const routeData = {
                userId,
                name: data.name,
                type: data.type,
                isPublic: data.isPublic,
                mapState: data.mapState,
                routes: data.routes || [],
                photos: data.photos || [],
                pois: data.pois || { draggable: [], places: [] }
            };
            console.log('[RouteService] Prepared data size:', JSON.stringify(routeData).length / 1024 / 1024, 'MB');
            let route;
            try {
                if (routeId) {
                    console.log('[RouteService] Updating existing route:', routeId);
                    // Update existing route
                    route = await route_model_1.RouteModel.findOneAndUpdate({ _id: routeId, userId }, // Only update if user owns the route
                    routeData, { new: true, runValidators: true } // Return updated document and run validators
                    ).catch(err => {
                        console.error('[RouteService] MongoDB update error:', {
                            name: err.name,
                            message: err.message,
                            code: err.code,
                            validationErrors: err.errors,
                            stack: err.stack
                        });
                        throw err;
                    });
                    if (!route) {
                        throw new Error('Route not found or access denied');
                    }
                }
                else {
                    console.log('[RouteService] Creating new route...');
                    // Create new route
                    route = new route_model_1.RouteModel(routeData);
                    await route.validate().catch(err => {
                        console.error('[RouteService] Validation error:', {
                            name: err.name,
                            message: err.message,
                            validationErrors: err.errors,
                            stack: err.stack
                        });
                        throw err;
                    });
                    await route.save().catch(err => {
                        console.error('[RouteService] MongoDB save error:', {
                            name: err.name,
                            message: err.message,
                            code: err.code,
                            validationErrors: err.errors,
                            stack: err.stack
                        });
                        throw err;
                    });
                }
                console.log('[RouteService] Route saved successfully');
            }
            catch (dbError) {
                console.error('[RouteService] Database operation failed:', {
                    error: dbError,
                    stack: dbError instanceof Error ? dbError.stack : undefined,
                    routeCount: data.routes?.length,
                    dataSize: JSON.stringify(routeData).length / 1024 / 1024 + 'MB'
                });
                throw dbError;
            }
            return {
                message: 'Route saved successfully',
                id: route._id.toString()
            };
        }
        catch (error) {
            console.error('[RouteService] Save error:', {
                error,
                stack: error instanceof Error ? error.stack : undefined,
                routeCount: data.routes?.length,
                dataSize: JSON.stringify(data).length / 1024 / 1024 + 'MB'
            });
            throw error;
        }
    }
    async loadRoute(userId, routeId) {
        try {
            const route = await route_model_1.RouteModel.findOne({ _id: routeId });
            if (!route) {
                throw new Error('Route not found');
            }
            // Check if user has access to this route
            if (route.userId !== userId && !route.isPublic) {
                throw new Error('Access denied');
            }
            const routeData = route.toJSON();
            console.log('[RouteService] Route loaded successfully');
            return {
                route: routeData,
                message: 'Route loaded successfully'
            };
        }
        catch (error) {
            throw new Error(`Failed to load route: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async listPublicRoutes(filter) {
        try {
            const query = { isPublic: true };
            // If type filter is provided
            if (filter?.type) {
                query.type = filter.type;
            }
            const routes = await route_model_1.RouteModel.find(query)
                .select('_id name type viewCount lastViewed createdAt updatedAt')
                .sort({ viewCount: -1, createdAt: -1 });
            return {
                routes: routes.map(route => ({
                    id: route._id.toString(),
                    name: route.name,
                    type: route.type,
                    isPublic: true,
                    viewCount: route.viewCount,
                    lastViewed: route.lastViewed ? new Date(route.lastViewed).toISOString() : undefined,
                    createdAt: route.createdAt,
                    updatedAt: route.updatedAt
                }))
            };
        }
        catch (error) {
            throw new Error(`Failed to list public routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async loadPublicRoute(routeId) {
        try {
            const route = await route_model_1.RouteModel.findOneAndUpdate({ _id: routeId, isPublic: true }, {
                $inc: { viewCount: 1 },
                $set: { lastViewed: new Date() }
            }, { new: true });
            if (!route) {
                throw new Error('Public route not found');
            }
            const routeData = route.toJSON();
            console.log('[RouteService] Public route loaded successfully');
            return {
                route: routeData,
                message: 'Route loaded successfully'
            };
        }
        catch (error) {
            throw new Error(`Failed to load public route: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                .select('_id name type isPublic viewCount lastViewed createdAt updatedAt')
                .sort({ createdAt: -1 });
            return {
                routes: routes.map(route => ({
                    id: route._id.toString(),
                    name: route.name,
                    type: route.type,
                    isPublic: route.isPublic,
                    viewCount: route.viewCount || 0,
                    lastViewed: route.lastViewed ? new Date(route.lastViewed).toISOString() : undefined,
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
            const route = await route_model_1.RouteModel.findOne({ _id: routeId });
            if (!route) {
                throw new Error('Route not found');
            }
            // Only allow deletion if user owns the route
            if (route.userId !== userId) {
                throw new Error('Access denied');
            }
            // Delete the route only
            await route_model_1.RouteModel.deleteOne({ _id: routeId });
            console.log('[RouteService] Route and associated POIs deleted successfully');
        }
        catch (error) {
            throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.RouteService = RouteService;
