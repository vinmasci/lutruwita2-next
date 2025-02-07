import { RouteModel } from '../models/route.model';
import { SaveRouteRequest, SaveRouteResponse, LoadRouteResponse, SavedRouteState, ListRoutesResponse } from '../types/route.types';
import mongoose from 'mongoose';
import { POIService } from '../../poi/services/poi.service';
import { DraggablePOI, PlaceNamePOI } from '../../../shared/types/poi.types';

export class RouteService {
  private poiService: POIService;

  constructor() {
    this.poiService = new POIService();
  }

  async saveRoute(userId: string, data: SaveRouteRequest & Partial<SavedRouteState>): Promise<SaveRouteResponse> {
    try {
      const routeId = new mongoose.Types.ObjectId();

      console.log('[RouteService] Starting route save process...');
      console.log('[RouteService] POIs received from client:', {
        draggable: data.pois?.draggable?.length || 0,
        places: data.pois?.places?.length || 0
      });
      console.log('[RouteService] Full POI data from client:', data.pois);

      // First save POIs using POI service
      console.log('[RouteService] Saving POIs using POI service...');
      const savedPOIs = await this.poiService.savePOIs({
        draggable: data.pois?.draggable || [],
        places: data.pois?.places || []
      });
      console.log('[RouteService] POIs saved successfully:', savedPOIs);

      // Create route with saved POIs
      const route = new RouteModel({
        _id: routeId,
        userId,
        name: data.name,
        type: data.type,
        isPublic: data.isPublic,
        mapState: data.mapState,
        routes: data.routes || [],
        photos: data.photos || [],
        pois: savedPOIs,
        places: data.places || []
      });

      console.log('[RouteService] Route model prepared for save:', route.toObject());

      const savedRoute = await route.save();
      console.log('[RouteService] Route saved successfully to MongoDB');
      console.log('[RouteService] Saved route details:', savedRoute.toObject());

      return {
        id: routeId.toString(),
        message: 'Route saved successfully'
      };
    } catch (error) {
      console.error('[RouteService] Save error:', error);
      throw new Error(`Failed to save route: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // Get route data with POIs included
      const routeData = route.toJSON() as SavedRouteState;

      // Ensure POIs are properly typed
      if (routeData.pois) {
        console.log('[RouteService] Loading POIs from route:', {
          draggable: routeData.pois.draggable?.length || 0,
          places: routeData.pois.places?.length || 0
        });

        // Load POIs through POI service to ensure proper typing
        const poiIds = [
          ...(routeData.pois.draggable?.map(poi => poi.id) || []),
          ...(routeData.pois.places?.map(poi => poi.id) || [])
        ];

        if (poiIds.length > 0) {
          const loadedPOIs = await this.poiService.getPOIsByIds(poiIds);
          
          // Separate POIs by type
          routeData.pois = {
            draggable: loadedPOIs.filter((poi): poi is DraggablePOI => poi.type === 'draggable'),
            places: loadedPOIs.filter((poi): poi is PlaceNamePOI => poi.type === 'place')
          };
        }
      }

      console.log('[RouteService] Route loaded with typed POIs:', routeData.pois);

      return {
        route: routeData,
        message: 'Route loaded successfully'
      };
    } catch (error) {
      throw new Error(`Failed to load route: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        .select('_id name type isPublic createdAt updatedAt')
        .sort({ createdAt: -1 });

      return {
        routes: routes.map(route => ({
          id: route._id.toString(),
          name: route.name,
          type: route.type,
          isPublic: route.isPublic,
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

      // Get POI IDs before deleting the route
      const poiIds = [
        ...(route.pois?.draggable?.map(poi => poi.id) || []),
        ...(route.pois?.places?.map(poi => poi.id) || [])
      ];

      // Delete POIs first
      if (poiIds.length > 0) {
        console.log('[RouteService] Deleting associated POIs:', poiIds);
        await this.poiService.deletePOIs(poiIds);
      }

      // Delete the route
      await RouteModel.deleteOne({ _id: routeId });
      console.log('[RouteService] Route and associated POIs deleted successfully');
    } catch (error) {
      throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
