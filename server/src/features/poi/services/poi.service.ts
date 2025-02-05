import { POI } from '../models/poi.model';
import { POIType } from '../../../shared/types/poi.types';

export class POIService {
  async getAllPOIs(userId: string) {
    return POI.find({ userId });
  }

  async createPOI(userId: string, poiData: POIType) {
    const poi = new POI({
      ...poiData,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return poi.save();
  }

  async updatePOI(userId: string, id: string, updates: Partial<POIType>) {
    const poi = await POI.findOneAndUpdate(
      { id, userId },
      { ...updates, updatedAt: new Date().toISOString() },
      { new: true }
    );
    if (!poi) {
      throw new Error('POI not found');
    }
    return poi;
  }

  async deletePOI(userId: string, id: string) {
    const poi = await POI.findOneAndDelete({ id, userId });
    if (!poi) {
      throw new Error('POI not found');
    }
    return poi;
  }
}
