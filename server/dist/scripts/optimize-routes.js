"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = require("dotenv");
const route_model_1 = require("../features/route/models/route.model");
// Load environment variables
(0, dotenv_1.config)();
const MONGODB_URI = process.env.MONGODB_URI || '';
if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
}
// Helper functions
const roundCoordinate = (value) => Number(value.toFixed(5));
const roundElevation = (value) => Number(value.toFixed(1));
const roundCoordinates = (coordinates) => {
    return coordinates.map(coord => [
        roundCoordinate(coord[0]),
        roundCoordinate(coord[1])
    ]);
};
async function optimizeRoutes() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected successfully');
        const routes = await route_model_1.RouteModel.find({});
        console.log(`Found ${routes.length} routes to optimize`);
        let processed = 0;
        for (const route of routes) {
            console.log(`\nProcessing route: ${route.name} (${processed + 1}/${routes.length})`);
            let modified = false;
            // Process each route in the routes array
            if (route.routes) {
                route.routes = route.routes.map(subRoute => {
                    // Remove rawGpx
                    if ('rawGpx' in subRoute) {
                        const { rawGpx, ...rest } = subRoute;
                        modified = true;
                        return rest;
                    }
                    // Round coordinates in geojson
                    if (subRoute.geojson) {
                        const geojson = subRoute.geojson;
                        const feature = geojson.features[0];
                        if (feature?.geometry?.coordinates) {
                            feature.geometry.coordinates = roundCoordinates(feature.geometry.coordinates);
                            modified = true;
                        }
                    }
                    // Round elevations in surface.elevationProfile
                    if (subRoute.surface?.elevationProfile) {
                        subRoute.surface.elevationProfile = subRoute.surface.elevationProfile.map(point => ({
                            ...point,
                            elevation: roundElevation(point.elevation)
                        }));
                        modified = true;
                    }
                    // Round coordinates in unpavedSections
                    if (subRoute.unpavedSections) {
                        subRoute.unpavedSections = subRoute.unpavedSections.map(section => ({
                            ...section,
                            coordinates: roundCoordinates(section.coordinates)
                        }));
                        modified = true;
                    }
                    return subRoute;
                });
            }
            // Round coordinates in mapState
            if (route.mapState?.center) {
                route.mapState.center = route.mapState.center.map(roundCoordinate);
                modified = true;
            }
            // Process photos
            if (route.photos?.length === 0) {
                route.photos = undefined;
                modified = true;
            }
            else if (route.photos) {
                route.photos = route.photos.map(photo => {
                    if (photo.coordinates) {
                        photo.coordinates.lat = roundCoordinate(photo.coordinates.lat);
                        photo.coordinates.lng = roundCoordinate(photo.coordinates.lng);
                        modified = true;
                    }
                    return photo;
                });
            }
            // Process POIs
            if (!route.pois?.draggable?.length && !route.pois?.places?.length) {
                route.pois = undefined;
                modified = true;
            }
            else if (route.pois) {
                const pois = route.pois;
                // Process draggable POIs
                if (pois.draggable?.length === 0) {
                    pois.draggable = undefined;
                    modified = true;
                }
                else if (pois.draggable) {
                    pois.draggable = pois.draggable.map((poi) => ({
                        ...poi,
                        coordinates: [
                            roundCoordinate(poi.coordinates[0]),
                            roundCoordinate(poi.coordinates[1])
                        ]
                    }));
                    modified = true;
                }
                // Process place POIs
                if (pois.places?.length === 0) {
                    pois.places = undefined;
                    modified = true;
                }
                else if (pois.places) {
                    pois.places = pois.places.map((poi) => ({
                        ...poi,
                        coordinates: [
                            roundCoordinate(poi.coordinates[0]),
                            roundCoordinate(poi.coordinates[1])
                        ]
                    }));
                    modified = true;
                }
            }
            if (modified) {
                try {
                    await route.save();
                    console.log('Route optimized and saved successfully');
                }
                catch (error) {
                    console.error('Error saving route:', error);
                    if (error instanceof Error) {
                        console.error('Validation errors:', error.message);
                    }
                }
            }
            else {
                console.log('No changes needed for this route');
            }
            processed++;
        }
        console.log('\nOptimization complete!');
        console.log(`Processed ${processed} routes`);
    }
    catch (error) {
        console.error('Migration failed:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
    }
}
// Run migration
optimizeRoutes().catch(console.error);
