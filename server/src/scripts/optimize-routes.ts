import mongoose from 'mongoose';
import { config } from 'dotenv';
import { RouteModel } from '../features/route/models/route.model';
import type { Feature, FeatureCollection, LineString } from 'geojson';

// Load environment variables
config();

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

// Helper functions
const roundCoordinate = (value: number): number => Number(value.toFixed(5));
const roundElevation = (value: number): number => Number(value.toFixed(1));

const roundCoordinates = (coordinates: [number, number][]): [number, number][] => {
  return coordinates.map(coord => [
    roundCoordinate(coord[0]),
    roundCoordinate(coord[1])
  ] as [number, number]);
};

async function optimizeRoutes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');

    const routes = await RouteModel.find({}).lean();
    console.log(`Found ${routes.length} routes to optimize`);

    let processed = 0;
    for (const route of routes) {
      console.log(`\nProcessing route: ${route.name} (${processed + 1}/${routes.length})`);
      let modified = false;

      // Create new object to store optimized route
      const updatedRoute = { ...route };

      // Process each route in the routes array
      if (updatedRoute.routes) {
        updatedRoute.routes = updatedRoute.routes.map(subRoute => {
          const optimizedSubRoute = { ...subRoute };

          // Remove rawGpx
          if ('rawGpx' in optimizedSubRoute) {
            const { rawGpx, ...rest } = optimizedSubRoute;
            modified = true;
            return rest;
          }

          // Round coordinates in geojson
          if (optimizedSubRoute.geojson) {
            const geojson = optimizedSubRoute.geojson as FeatureCollection;
            const feature = geojson.features[0] as Feature<LineString>;
            if (feature?.geometry?.coordinates) {
              feature.geometry.coordinates = roundCoordinates(feature.geometry.coordinates as [number, number][]);
              modified = true;
            }
          }

          // Round elevations in surface.elevationProfile
          if (optimizedSubRoute.surface?.elevationProfile) {
            optimizedSubRoute.surface.elevationProfile = optimizedSubRoute.surface.elevationProfile.map(point => ({
              ...point,
              elevation: roundElevation(point.elevation)
            }));
            modified = true;
          }

          // Round coordinates in unpavedSections
          if (optimizedSubRoute.unpavedSections) {
            optimizedSubRoute.unpavedSections = optimizedSubRoute.unpavedSections.map(section => ({
              ...section,
              coordinates: roundCoordinates(section.coordinates as [number, number][])
            }));
            modified = true;
          }

          return optimizedSubRoute;
        });
      }

      // Round coordinates in mapState
      if (updatedRoute.mapState?.center) {
        updatedRoute.mapState.center = updatedRoute.mapState.center.map(roundCoordinate) as [number, number];
        modified = true;
      }

      // Initialize or optimize photos array
      updatedRoute.photos = route.photos?.map(photo => {
        if (photo.coordinates) {
          return {
            ...photo,
            coordinates: {
              lat: roundCoordinate(photo.coordinates.lat),
              lng: roundCoordinate(photo.coordinates.lng)
            }
          };
        }
        return photo;
      }) || [];
      modified = true;

      // Initialize or optimize POIs
      updatedRoute.pois = {
        draggable: route.pois?.draggable?.map(poi => ({
          ...poi,
          coordinates: [
            roundCoordinate(poi.coordinates[0]),
            roundCoordinate(poi.coordinates[1])
          ] as [number, number]
        })) || [],
        places: route.pois?.places?.map(poi => ({
          ...poi,
          coordinates: [
            roundCoordinate(poi.coordinates[0]),
            roundCoordinate(poi.coordinates[1])
          ] as [number, number]
        })) || []
      };
      modified = true;

      if (modified) {
        try {
          await RouteModel.findByIdAndUpdate(route._id, updatedRoute, { new: true });
          console.log('Route optimized and saved successfully');
        } catch (error) {
          console.error('Error saving route:', error);
          if (error instanceof Error) {
            console.error('Validation errors:', error.message);
          }
        }
      } else {
        console.log('No changes needed for this route');
      }

      processed++;
    }

    console.log('\nOptimization complete!');
    console.log(`Processed ${processed} routes`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
optimizeRoutes().catch(console.error);
