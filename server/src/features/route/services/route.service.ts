import { RouteModel } from '../models/route.model';
import { SaveRouteRequest, SaveRouteResponse, LoadRouteResponse, SavedRouteState, ListRoutesResponse } from '../types/route.types';
import mongoose from 'mongoose';
import { POIService } from '../../poi/services/poi.service';
import { DraggablePOI, PlaceNamePOI } from '../../../shared/types/poi.types';

export class RouteService {
  async saveRoute(userId: string, data: SaveRouteRequest & Partial<SavedRouteState>, routeId?: string): Promise<SaveRouteResponse> {
    try {
      console.log('[RouteService] Starting route save process...');

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

      let route;
      if (routeId) {
        // Update existing route
        route = await RouteModel.findOneAndUpdate(
          { _id: routeId, userId }, // Only update if user owns the route
          routeData,
          { new: true } // Return updated document
        );
        
        if (!route) {
          throw new Error('Route not found or access denied');
        }
      } else {
        // Create new route
        route = new RouteModel(routeData);
        await route.save();
      }
      console.log('[RouteService] Route saved successfully');

      return {
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

      // Delete the route only
      await RouteModel.deleteOne({ _id: routeId });
      console.log('[RouteService] Route and associated POIs deleted successfully');
    } catch (error) {
      throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
