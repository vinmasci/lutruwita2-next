import { Response } from 'express';
import { POIService } from '../services/poi.service';
import { RequestWithAuth } from '../../../shared/types/auth.types';

export class POIController {
  private poiService: POIService;

  constructor() {
    this.poiService = new POIService();
  }

  async getAll(req: RequestWithAuth, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const pois = await this.poiService.getAllPOIs(userId);
      res.json(pois);
    } catch (error) {
      console.error('Error fetching POIs:', error);
      res.status(500).json({
        error: 'Failed to fetch POIs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async create(req: RequestWithAuth, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate required fields
      const { position, name, type, category, icon } = req.body;
      if (!position || !name || !type || !category || !icon) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'position, name, type, category, and icon are required'
        });
      }

      // Validate position
      if (typeof position.lat !== 'number' || typeof position.lng !== 'number') {
        return res.status(400).json({
          error: 'Invalid position',
          details: 'position must contain numeric lat and lng values'
        });
      }

      // Validate type
      if (!['draggable', 'place'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid type',
          details: 'type must be either "draggable" or "place"'
        });
      }

      // If type is 'place', validate placeId
      if (type === 'place' && !req.body.placeId) {
        return res.status(400).json({
          error: 'Missing placeId',
          details: 'placeId is required for POIs of type "place"'
        });
      }

      const poi = await this.poiService.createPOI(userId, req.body);
      res.status(201).json(poi);
    } catch (error) {
      console.error('Error creating POI:', error);
      
      // Handle mongoose validation errors
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to create POI',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async update(req: RequestWithAuth, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          error: 'Invalid request',
          details: 'POI ID is required'
        });
      }

      // Validate position if provided
      const { position } = req.body;
      if (position && (typeof position.lat !== 'number' || typeof position.lng !== 'number')) {
        return res.status(400).json({
          error: 'Invalid position',
          details: 'position must contain numeric lat and lng values'
        });
      }

      // Validate type if provided
      const { type } = req.body;
      if (type && !['draggable', 'place'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid type',
          details: 'type must be either "draggable" or "place"'
        });
      }

      // If changing to 'place' type, validate placeId
      if (type === 'place' && !req.body.placeId) {
        return res.status(400).json({
          error: 'Missing placeId',
          details: 'placeId is required when type is "place"'
        });
      }

      const poi = await this.poiService.updatePOI(userId, id, req.body);
      res.json(poi);
    } catch (error) {
      console.error('Error updating POI:', error);
      
      // Handle mongoose validation errors
      if (error instanceof Error && error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.message
        });
      }

      // Handle not found error
      if (error instanceof Error && error.message === 'POI not found') {
        return res.status(404).json({
          error: 'POI not found',
          details: 'The requested POI does not exist or you do not have permission to modify it'
        });
      }

      res.status(500).json({
        error: 'Failed to update POI',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async delete(req: RequestWithAuth, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          error: 'Invalid request',
          details: 'POI ID is required'
        });
      }

      await this.poiService.deletePOI(userId, id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting POI:', error);
      const status = error instanceof Error && error.message === 'POI not found' ? 404 : 500;
      res.status(status).json({
        error: 'Failed to delete POI',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
