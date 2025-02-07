import { POI } from '../models/poi.model';
import { POIType } from '../../../shared/types/poi.types';

export class POIService {
  async getAllPOIs(userId: string) {
    return POI.find({ userId });
  }

  async createPOI(userId: string, poiData: POIType) {
    const poi = new POI({
      _id: poiData.id, // Use client-generated UUID as _id
      ...poiData,
      userId,
    });
    
    try {
      const savedPoi = await poi.save();
      return savedPoi;
    } catch (error) {
      console.error('Error creating POI:', error);
      throw error;
    }
  }

  async updatePOI(userId: string, id: string, updates: Partial<POIType>) {
    const poi = await POI.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!poi) {
      throw new Error('POI not found');
    }
    return poi;
  }

  async deletePOI(userId: string, id: string) {
    const poi = await POI.findOneAndDelete({ _id: id, userId });
    if (!poi) {
      throw new Error('POI not found');
    }
    return poi;
  }
}
