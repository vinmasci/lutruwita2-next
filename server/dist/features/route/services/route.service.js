"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteService = void 0;
const route_model_1 = require("../models/route.model");
const mongoose_1 = __importDefault(require("mongoose"));
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
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
            let persistentId;
            if (routeId) {
                const existingRoute = await route_model_1.RouteModel.findOne({ persistentId: routeId, userId });
                if (!existingRoute) {
                    throw new Error('Route not found or access denied');
                }
                persistentId = existingRoute.persistentId;
            }
            else {
                persistentId = (0, uuid_1.v4)();
            }
            console.log('[RouteService] Preparing route data...');
            const routeData = {
                userId,
                persistentId,
                name: data.name,
                type: data.type,
                isPublic: data.isPublic,
                mapState: data.mapState,
                routes: data.routes || [],
                photos: data.photos || [],
                pois: data.pois || { draggable: [], places: [] }
            };
            console.log('[RouteService] Prepared data size:', JSON.stringify(routeData).length / 1024 / 1024, 'MB');
            let savedRoute;
            try {
                if (routeId) {
                    console.log('[RouteService] Creating new version of route:', routeId, {
                        oldId: routeId,
                        userId,
                        routeCount: data.routes?.length
                    });
                    // Use a MongoDB session for atomic operations
                    const session = await mongoose_1.default.startSession();
                    try {
                        // Create and save new route within transaction
                        savedRoute = await session.withTransaction(async () => {
                            const newRoute = new route_model_1.RouteModel(routeData);
                            await newRoute.validate().catch(err => {
                                console.error('[RouteService] Validation error:', {
                                    name: err.name,
                                    message: err.message,
                                    validationErrors: err.errors,
                                    stack: err.stack
                                });
                                throw err;
                            });
                            const saved = await newRoute.save({ session }).catch(err => {
                                console.error('[RouteService] MongoDB save error:', {
                                    name: err.name,
                                    message: err.message,
                                    code: err.code,
                                    validationErrors: err.errors,
                                    stack: err.stack
                                });
                                throw err;
                            });
                            // Delete the old route
                            await route_model_1.RouteModel.deleteOne({ persistentId: routeId, userId }, { session });
                            return saved;
                        });
                    }
                    finally {
                        await session.endSession();
                    }
                    if (!savedRoute) {
                        throw new Error('Failed to save new route version');
                    }
                    console.log('[RouteService] Route replacement completed:', {
                        oldId: routeId,
                        newId: savedRoute._id.toString(),
                        persistentId,
                        userId
                    });
                }
                else {
                    console.log('[RouteService] Creating new route...');
                    // Create new route
                    const newRoute = new route_model_1.RouteModel(routeData);
                    await newRoute.validate().catch(err => {
                        console.error('[RouteService] Validation error:', {
                            name: err.name,
                            message: err.message,
                            validationErrors: err.errors,
                            stack: err.stack
                        });
                        throw err;
                    });
                    savedRoute = await newRoute.save().catch(err => {
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
                id: savedRoute._id.toString(),
                persistentId: savedRoute.persistentId
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
            const route = await route_model_1.RouteModel.findOne({ persistentId: routeId });
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
                .select('_id persistentId name type viewCount lastViewed createdAt updatedAt mapState routes pois photos')
                .sort({ viewCount: -1, createdAt: -1 });
            return {
                routes: routes.map(route => ({
                    id: route._id.toString(),
                    persistentId: route.persistentId,
                    name: route.name,
                    type: route.type,
                    isPublic: true,
                    viewCount: route.viewCount,
                    lastViewed: route.lastViewed ? new Date(route.lastViewed).toISOString() : undefined,
                    createdAt: route.createdAt,
                    updatedAt: route.updatedAt,
                    mapState: route.mapState || { center: [-42.8821, 147.3272], zoom: 8 }, // Default to Tasmania
                    routes: route.routes || [],
                    pois: route.pois || { draggable: [], places: [] },
                    photos: route.photos || []
                }))
            };
        }
        catch (error) {
            throw new Error(`Failed to list public routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async loadPublicRoute(routeId) {
        try {
            console.log('[RouteService] Loading public route:', routeId);
            const route = await route_model_1.RouteModel.findOneAndUpdate({ persistentId: routeId, isPublic: true }, {
                $inc: { viewCount: 1 },
                $set: { lastViewed: new Date() }
            }, { new: true });
            if (!route) {
                console.error('[RouteService] Public route not found:', routeId);
                throw new Error('Public route not found');
            }
            const routeData = route.toJSON();
            console.log('[RouteService] Public route data:', {
                id: routeData.id,
                persistentId: routeData.persistentId,
                name: routeData.name,
                routeCount: routeData.routes?.length,
                hasMapState: !!routeData.mapState,
                routeDetails: routeData.routes?.map(r => ({
                    id: r.routeId,
                    name: r.name,
                    hasGeojson: !!r.geojson,
                    geojsonFeatures: r.geojson?.features?.length
                }))
            });
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
            // Only show the current user's routes
            query.userId = userId;
            const routes = await route_model_1.RouteModel.find(query)
                .select('_id persistentId name type isPublic viewCount lastViewed createdAt updatedAt')
                .sort({ createdAt: -1 });
            return {
                routes: routes.map(route => ({
                    id: route._id.toString(),
                    persistentId: route.persistentId,
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
    /**
     * Extract Cloudinary public ID from a URL
     * @param url The Cloudinary URL
     * @returns The extracted public ID or undefined if not found
     */
    extractPublicIdFromUrl(url) {
        try {
            // Cloudinary URLs are typically in the format:
            // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            // The public ID is everything after /upload/vXXXXXXXXXX/
            const uploadIndex = pathParts.findIndex(part => part === 'upload');
            if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
                // Skip the version part (vXXXXXXXXXX)
                return pathParts.slice(uploadIndex + 2).join('/');
            }
            return undefined;
        }
        catch (error) {
            console.error('[RouteService] Error extracting public ID from URL:', error);
            return undefined;
        }
    }
    /**
     * Delete a photo from Cloudinary
     * @param publicId The Cloudinary public ID
     * @returns Promise that resolves when deletion is complete
     */
    async deleteCloudinaryPhoto(publicId) {
        try {
            // Use Cloudinary API to delete the photo
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;
            if (!cloudName || !apiKey || !apiSecret) {
                console.error('[RouteService] Cloudinary credentials not found in environment variables');
                return;
            }
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = require('crypto')
                .createHash('sha1')
                .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
                .digest('hex');
            const response = await axios_1.default.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
                public_id: publicId,
                timestamp,
                signature,
                api_key: apiKey
            });
            console.log(`[RouteService] Deleted photo from Cloudinary: ${publicId}`, response.data);
        }
        catch (error) {
            console.error(`[RouteService] Error deleting photo from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async deleteRoute(userId, routeId) {
        try {
            const route = await route_model_1.RouteModel.findOne({ persistentId: routeId });
            if (!route) {
                throw new Error('Route not found');
            }
            // Only allow deletion if user owns the route
            if (route.userId !== userId) {
                throw new Error('Access denied');
            }
            // Delete associated photos from Cloudinary
            if (route.photos && route.photos.length > 0) {
                console.log(`[RouteService] Deleting ${route.photos.length} photos from Cloudinary`);
                for (const photo of route.photos) {
                    try {
                        // Extract publicId from URL or use stored publicId
                        let publicId = photo.publicId;
                        if (!publicId && photo.url) {
                            publicId = this.extractPublicIdFromUrl(photo.url);
                        }
                        if (publicId) {
                            await this.deleteCloudinaryPhoto(publicId);
                            console.log(`[RouteService] Deleted photo: ${publicId}`);
                        }
                        else {
                            console.warn(`[RouteService] Could not extract public ID from photo URL: ${photo.url}`);
                        }
                    }
                    catch (photoError) {
                        console.error(`[RouteService] Error deleting photo: ${photoError instanceof Error ? photoError.message : 'Unknown error'}`);
                        // Continue with other photos even if one fails
                    }
                }
            }
            // Delete the route
            await route_model_1.RouteModel.deleteOne({ persistentId: routeId });
            console.log('[RouteService] Route and associated photos deleted successfully');
        }
        catch (error) {
            throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.RouteService = RouteService;
