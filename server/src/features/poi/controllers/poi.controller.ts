import { Request, Response } from 'express';
import { POIService } from '../services/poi.service';

export class POIController {
  private poiService: POIService;

  constructor() {
    this.poiService = new POIService();
  }

  async deletePOIs(req: Request, res: Response): Promise<void> {
    try {
      const poiIds = req.body.poiIds;
      if (!Array.isArray(poiIds)) {
        res.status(400).json({ error: 'poiIds must be an array' });
        return;
      }
      await this.poiService.deletePOIs(poiIds);
      res.status(200).json({ message: 'POIs deleted successfully' });
    } catch (error) {
      console.error('[POIController] Delete POIs error:', error);
      res.status(500).json({ error: 'Failed to delete POIs' });
    }
  }
}
