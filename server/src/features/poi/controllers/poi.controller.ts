import { Request, Response } from 'express';
import { POIService } from '../services/poi.service';

export class POIController {
  private poiService: POIService;

  constructor() {
    this.poiService = new POIService();
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
