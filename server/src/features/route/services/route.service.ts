import { RouteModel } from '../models/route.model';
import { SaveRouteRequest, SaveRouteResponse, LoadRouteResponse, SavedRouteState, ListRoutesResponse } from '../types/route.types';
import mongoose from 'mongoose';

export class RouteService {
  async saveRoute(userId: string, data: SaveRouteRequest & Partial<SavedRouteState>): Promise<SaveRouteResponse> {
    try {
      const routeId = new mongoose.Types.ObjectId().toString();

      const route = new RouteModel({
        id: routeId,
        userId,
        name: data.name,
        type: data.type,
        isPublic: data.isPublic,
        mapState: data.mapState,
        routes: data.routes || [],
        photos: data.photos || [],
        pois: {
          draggable: data.pois?.draggable || [],
          places: data.pois?.places || []
        },
        places: data.places || []
      });

      await route.save();

      return {
        id: routeId,
        message: 'Route saved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to save route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async loadRoute(userId: string, routeId: string): Promise<LoadRouteResponse> {
    try {
      const route = await RouteModel.findOne({ id: routeId });

      if (!route) {
        throw new Error('Route not found');
      }

      // Check if user has access to this route
      if (route.userId !== userId && !route.isPublic) {
        throw new Error('Access denied');
      }

      return {
        route: route.toJSON() as SavedRouteState,
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
        .select('id name type isPublic createdAt updatedAt')
        .sort({ createdAt: -1 });

      return {
        routes: routes.map(route => ({
          id: route.id,
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
      const route = await RouteModel.findOne({ id: routeId });

      if (!route) {
        throw new Error('Route not found');
      }

      // Only allow deletion if user owns the route
      if (route.userId !== userId) {
        throw new Error('Access denied');
      }

      await RouteModel.deleteOne({ id: routeId });
    } catch (error) {
      throw new Error(`Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
