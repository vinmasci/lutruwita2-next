import { POIModel } from '../models/poi.model';
import { POIType } from '../../../shared/types/poi.types';

export class POIService {
  async savePOIs(pois: { draggable: POIType[]; places: POIType[] }): Promise<{ draggable: POIType[]; places: POIType[] }> {
    try {
      console.log('[POIService] Starting POI save process...');

      // Save and collect draggable POIs
      const savedDraggable = await Promise.all(pois.draggable.map(async (poi) => {
        const poiDoc = new POIModel({
          position: poi.position,
          name: poi.name,
          description: poi.description,
          category: poi.category,
          icon: poi.icon,
          photos: poi.photos,
          style: poi.style,
          type: 'draggable'
        });
        const saved = await poiDoc.save();
        return { ...poi, id: saved._id.toString() };
      }));

      // Save and collect place POIs
      const savedPlaces = await Promise.all(pois.places.map(async (poi) => {
        if (poi.type !== 'place') {
          throw new Error('Invalid POI type in places array');
        }

        const poiDoc = new POIModel({
          position: poi.position,
          name: poi.name,
          description: poi.description,
          category: poi.category,
          icon: poi.icon,
          photos: poi.photos,
          style: poi.style,
          type: 'place',
          placeId: poi.placeId
        });
        const saved = await poiDoc.save();
        return { ...poi, id: saved._id.toString() };
      }));

      console.log('[POIService] POIs saved successfully');
      return {
        draggable: savedDraggable,
        places: savedPlaces
      };
    } catch (error) {
      console.error('[POIService] Failed to save POIs:', error);
      throw error;
    }
  }

  async deleteAllPOIs(): Promise<void> {
    try {
      await POIModel.deleteMany({});
      console.log('[POIService] All POIs deleted successfully');
    } catch (error) {
      console.error('[POIService] Failed to delete POIs:', error);
      throw error;
    }
  }
}
