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

      const poi = await this.poiService.createPOI(userId, req.body);
      res.status(201).json(poi);
    } catch (error) {
      console.error('Error creating POI:', error);
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

      const poi = await this.poiService.updatePOI(userId, id, req.body);
      res.json(poi);
    } catch (error) {
      console.error('Error updating POI:', error);
      const status = error instanceof Error && error.message === 'POI not found' ? 404 : 500;
      res.status(status).json({
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
