import { Request, Response } from 'express';
import { POIService } from '../services/poi.service';

export class POIController {
  private poiService: POIService;

  constructor() {
    this.poiService = new POIService();
  }

  async getPOIs(req: Request, res: Response): Promise<void> {
    try {
      const pois = await this.poiService.getPOIs();
      res.status(200).json(pois);
    } catch (error) {
      console.error('[POIController] Get POIs error:', error);
      res.status(500).json({ error: 'Failed to get POIs' });
    }
  }

  async savePOIs(req: Request, res: Response): Promise<void> {
    try {
      const savedPOIs = await this.poiService.savePOIs(req.body);
      res.status(200).json(savedPOIs);
    } catch (error) {
      console.error('[POIController] Save POIs error:', error);
      res.status(500).json({ error: 'Failed to save POIs' });
    }
  }

  async deleteAllPOIs(req: Request, res: Response): Promise<void> {
    try {
      await this.poiService.deleteAllPOIs();
      res.status(200).json({ message: 'All POIs deleted successfully' });
    } catch (error) {
      console.error('[POIController] Delete POIs error:', error);
      res.status(500).json({ error: 'Failed to delete POIs' });
    }
  }
}
