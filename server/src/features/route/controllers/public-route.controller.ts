import { Request, Response } from 'express';
import { RouteService } from '../services/route.service';

export class PublicRouteController {
  private routeService: RouteService;

  constructor() {
    this.routeService = new RouteService();
  }

  async listPublicRoutes(req: Request, res: Response) {
    try {
      const { type } = req.query;
      const filter: { type?: string } = {};

      if (type && typeof type === 'string') {
        filter.type = type;
      }

      const result = await this.routeService.listPublicRoutes(filter);
      res.json(result);
    } catch (error) {
      console.error('List public routes error:', error);
      res.status(500).json({
        error: 'Failed to list public routes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async loadPublicRoute(req: Request, res: Response) {
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
    } catch (error) {
      console.error('Load public route error:', error);
      const status = error instanceof Error && error.message === 'Public route not found' ? 404 : 500;
      res.status(status).json({
        error: 'Failed to load public route',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
