import { POIModel } from '../models/poi.model';
import { POIType, StoredPOIs, DraggablePOI, PlaceNamePOI, POICategory } from '../../../shared/types/poi.types';

export class POIService {
  async savePOIs(pois: { draggable: POIType[]; places: POIType[] }): Promise<StoredPOIs> {
    try {
      console.log('[POIService] Starting POI save process...');
      console.log('[POIService] POIs to save:', {
        draggable: pois.draggable.length,
        places: pois.places.length
      });

      // Save draggable POIs
      const savedDraggablePOIs = await Promise.all(
        pois.draggable.map(async (poi) => {
          // If POI already has an ID, try to update it
          if (poi.id) {
            const existingPOI = await POIModel.findById(poi.id);
            if (existingPOI) {
              Object.assign(existingPOI, {
                routeId: poi.routeId,
                position: poi.position,
                name: poi.name,
                description: poi.description,
                category: poi.category,
                icon: poi.icon,
                photos: poi.photos,
                style: poi.style,
                type: 'draggable'
              });
              const saved = await existingPOI.save();
              const obj = saved.toObject();
              return {
                id: obj._id.toString(),
                routeId: obj.routeId || undefined,
                position: obj.position || { lat: 0, lng: 0 },
                name: obj.name || '',
                description: obj.description || undefined,
                category: obj.category as POICategory,
                icon: obj.icon || '',
                photos: obj.photos?.map(p => ({
                  url: p.url,
                  caption: p.caption || undefined
                })) || [],
                style: obj.style ? {
                  color: obj.style.color || undefined,
                  size: obj.style.size || undefined
                } : undefined,
                type: 'draggable'
              } as DraggablePOI;
            }
          }

          // Create new POI if no ID or existing POI not found
          const poiDoc = new POIModel({
            routeId: poi.routeId,
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
          const obj = saved.toObject();
          // Ensure all required fields are present and properly typed
          const draggablePOI: DraggablePOI = {
            id: obj._id.toString(), // Use _id since we're not setting id in schema
            routeId: obj.routeId || undefined,
            position: obj.position || { lat: 0, lng: 0 }, // Provide default if missing
            name: obj.name || '',
            description: obj.description || undefined,
            category: obj.category as POICategory,
            icon: obj.icon || '',
            photos: obj.photos?.map(p => ({
              url: p.url,
              caption: p.caption || undefined
            })) || [],
            style: obj.style ? {
              color: obj.style.color || undefined,
              size: obj.style.size || undefined
            } : undefined,
            type: 'draggable'
          };
          return draggablePOI;
        })
      );

      // Save place POIs
      const savedPlacePOIs = await Promise.all(
        pois.places.map(async (poi) => {
          if (poi.type !== 'place') {
            throw new Error('Invalid POI type in places array');
          }

          // If POI already has an ID, try to update it
          if (poi.id) {
            const existingPOI = await POIModel.findById(poi.id);
            if (existingPOI) {
              Object.assign(existingPOI, {
                routeId: poi.routeId,
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
              const saved = await existingPOI.save();
              const obj = saved.toObject();
              return {
                id: obj._id.toString(),
                routeId: obj.routeId || undefined,
                position: obj.position || { lat: 0, lng: 0 },
                name: obj.name || '',
                description: obj.description || undefined,
                category: obj.category as POICategory,
                icon: obj.icon || '',
                photos: obj.photos?.map(p => ({
                  url: p.url,
                  caption: p.caption || undefined
                })) || [],
                style: obj.style ? {
                  color: obj.style.color || undefined,
                  size: obj.style.size || undefined
                } : undefined,
                type: 'place',
                placeId: obj.placeId || ''
              } as PlaceNamePOI;
            }
          }

          // Create new POI if no ID or existing POI not found
          const poiDoc = new POIModel({
            routeId: poi.routeId,
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
          const obj = saved.toObject();
          // Ensure all required fields are present and properly typed
          const placePOI: PlaceNamePOI = {
            id: obj._id.toString(), // Use _id since we're not setting id in schema
            routeId: obj.routeId || undefined,
            position: obj.position || { lat: 0, lng: 0 }, // Provide default if missing
            name: obj.name || '',
            description: obj.description || undefined,
            category: obj.category as POICategory,
            icon: obj.icon || '',
            photos: obj.photos?.map(p => ({
              url: p.url,
              caption: p.caption || undefined
            })) || [],
            style: obj.style ? {
              color: obj.style.color || undefined,
              size: obj.style.size || undefined
            } : undefined,
            type: 'place',
            placeId: obj.placeId || ''
          };
          return placePOI;
        })
      );

      console.log('[POIService] POIs saved successfully:', {
        draggable: savedDraggablePOIs.length,
        places: savedPlacePOIs.length
      });

      return {
        draggable: savedDraggablePOIs,
        places: savedPlacePOIs
      };
    } catch (error) {
      console.error('[POIService] Failed to save POIs:', error);
      throw error;
    }
  }

  async getPOIsByIds(poiIds: string[]): Promise<POIType[]> {
    try {
      const pois = await POIModel.find({ _id: { $in: poiIds } });
      return pois.map(poi => {
        const obj = poi.toObject();
        const base = {
          id: obj._id.toString(), // Use _id since we're not setting id in schema
          routeId: obj.routeId || undefined,
          position: obj.position || { lat: 0, lng: 0 },
          name: obj.name || '',
          description: obj.description || undefined,
          category: obj.category as POICategory,
          icon: obj.icon || '',
          photos: obj.photos?.map(p => ({
            url: p.url,
            caption: p.caption || undefined
          })) || [],
          style: obj.style ? {
            color: obj.style.color || undefined,
            size: obj.style.size || undefined
          } : undefined
        };

        if (obj.type === 'place') {
          return {
            ...base,
            type: 'place',
            placeId: obj.placeId || ''
          } as PlaceNamePOI;
        } else {
          return {
            ...base,
            type: 'draggable'
          } as DraggablePOI;
        }
      });
    } catch (error) {
      console.error('[POIService] Failed to get POIs by IDs:', error);
      throw error;
    }
  }

  async deletePOIs(poiIds: string[]): Promise<void> {
    try {
      await POIModel.deleteMany({ _id: { $in: poiIds } });
    } catch (error) {
      console.error('[POIService] Failed to delete POIs:', error);
      throw error;
    }
  }
}
