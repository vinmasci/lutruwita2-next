import { RouteModel } from '../models/route.model';
import { SaveRouteRequest, SaveRouteResponse, LoadRouteResponse, SavedRouteState, ListRoutesResponse } from '../types/route.types';
import mongoose from 'mongoose';
import { POIService } from '../../poi/services/poi.service';
import { DraggablePOI, PlaceNamePOI } from '../../../shared/types/poi.types';
import { ProcessedRoute } from '../../../shared/types/gpx.types';
import type { Feature, FeatureCollection, LineString } from 'geojson';

export class RouteService {
  async saveRoute(userId: string, data: SaveRouteRequest & {
    mapState?: {
      zoom: number;
      center: [number, number];
      bearing: number;
      pitch: number;
      style?: string;
    };
    routes?: ProcessedRoute[];
    photos?: {
      id: string;
      name: string;
      url: string;
      thumbnailUrl: string;
      dateAdded: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
      rotation?: number;
      altitude?: number;
    }[];
    pois?: {
      draggable: DraggablePOI[];
      places: PlaceNamePOI[];
    };
  }, routeId?: string): Promise<SaveRouteResponse> {
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
            ? (route.geojson.features[0].geometry as GeoJSON.LineString).coordinates.length 
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

      let savedRoute;
      try {
        if (routeId) {
          console.log('[RouteService] Creating new version of route:', routeId, {
            oldId: routeId,
            userId,
            routeCount: data.routes?.length
          });
          // Verify user owns the route before proceeding
          const existingRoute = await RouteModel.findOne({ _id: routeId, userId });
          if (!existingRoute) {
            throw new Error('Route not found or access denied');
          }

          // Use a MongoDB session for atomic operations
          const session = await mongoose.startSession();
          try {
            // Create and save new route within transaction
            savedRoute = await session.withTransaction(async () => {
              const newRoute = new RouteModel(routeData);
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
              await RouteModel.deleteOne({ _id: routeId, userId }, { session });
              return saved;
            });
          } finally {
            await session.endSession();
          }

          if (!savedRoute) {
            throw new Error('Failed to save new route version');
          }

          console.log('[RouteService] Route replacement completed:', {
            oldId: routeId,
            newId: savedRoute._id.toString(),
            userId
          });
        } else {
          console.log('[RouteService] Creating new route...');
          // Create new route
          const newRoute = new RouteModel(routeData);
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
      } catch (dbError) {
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
        id: savedRoute._id.toString()
      };
    } catch (error) {
      console.error('[RouteService] Save error:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        routeCount: data.routes?.length,
        dataSize: JSON.stringify(data).length / 1024 / 1024 + 'MB'
      });
      throw error;
    }
  }

  async loadRoute(userId: string, routeId: string): Promise<LoadRouteResponse> {
    try {
      const route = await RouteModel.findOne({ _id: routeId });

      if (!route) {
        throw new Error('Route not found');
      }

      // Check if user has access to this route
      if (route.userId !== userId && !route.isPublic) {
        throw new Error('Access denied');
      }

      const routeData = route.toJSON() as SavedRouteState;
      console.log('[RouteService] Route loaded successfully');

      return {
        route: routeData,
        message: 'Route loaded successfully'
      };
    } catch (error) {
      throw new Error(`Failed to load route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listPublicRoutes(filter?: { type?: string }): Promise<ListRoutesResponse> {
    try {
      const query: any = { isPublic: true };

      // If type filter is provided
      if (filter?.type) {
        query.type = filter.type;
      }

      const routes = await RouteModel.find(query)
        .select('_id name type viewCount lastViewed createdAt updatedAt mapState routes pois photos')
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
          updatedAt: route.updatedAt,
          mapState: route.mapState || { center: [-42.8821, 147.3272], zoom: 8 }, // Default to Tasmania
          routes: route.routes || [],
          pois: route.pois || { draggable: [], places: [] },
          photos: route.photos || []
        }))
      };
    } catch (error) {
      throw new Error(`Failed to list public routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadPublicRoute(routeId: string): Promise<LoadRouteResponse> {
    try {
      console.log('[RouteService] Loading public route:', routeId);
      
      const route = await RouteModel.findOneAndUpdate(
        { _id: routeId, isPublic: true },
        { 
          $inc: { viewCount: 1 },
          $set: { lastViewed: new Date() }
        },
        { new: true }
      );

      if (!route) {
        console.error('[RouteService] Public route not found:', routeId);
        throw new Error('Public route not found');
      }

      const routeData = route.toJSON() as SavedRouteState;
      console.log('[RouteService] Public route data:', {
        id: routeData.id,
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
    } catch (error) {
      throw new Error(`Failed to load public route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listRoutes(userId: string, filter?: { type?: string; isPublic?: boolean }): Promise<ListRoutesResponse> {
    try {
      const query: any = {};

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

      const routes = await RouteModel.find(query)
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
    } catch (error) {
      throw new Error(`Failed to list routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteRoute(userId: string, routeId: string): Promise<void> {
    try {
      const route = await RouteModel.findOne({ _id: routeId });

      if (!route) {
        throw new Error('Route not found');
      }

      // Only allow deletion if user owns the route
      if (route.userId !== userId) {
        throw new Error('Access denied');
      }

      // Delete the route only
      await RouteModel.deleteOne({ _id: routeId });
      console.log('[RouteService] Route and associated POIs deleted successfully');
    } catch (error) {
      throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
