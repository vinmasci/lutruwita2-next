import React, { useEffect, useState } from 'react';
import { useMapContext } from '../../../map/context/MapContext';
import { usePhotoContext } from '../../context/PhotoContext';
import { PhotoMarker } from '../PhotoMarker/PhotoMarker';
import { PhotoPreviewModal } from '../PhotoPreview/PhotoPreviewModal';
import { ProcessedPhoto } from '../Uploader/PhotoUploader.types';
import mapboxgl from 'mapbox-gl';
import './PhotoLayer.css';

// Cluster configuration
const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_RADIUS = 50;

export const PhotoLayer: React.FC = () => {
  const { map } = useMapContext();
  const { photos } = usePhotoContext();
  const [selectedPhoto, setSelectedPhoto] = useState<ProcessedPhoto | null>(null);

  useEffect(() => {
    if (!map) return;

    console.log('[PhotoLayer] Setting up photo markers with photos:', photos);
    console.log('[PhotoLayer] Current zoom:', map.getZoom());

    // Add cluster source
    map.addSource('photos', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: photos
          .filter(p => p.coordinates)
          .map(photo => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [photo.coordinates!.lng, photo.coordinates!.lat]
            },
            properties: {
              id: photo.id,
              thumbnailUrl: photo.thumbnailUrl
            }
          }))
      },
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS
    });

    // Add cluster layers
    map.addLayer({
      id: 'photo-clusters',
      type: 'circle',
      source: 'photos',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgba(255, 255, 255, 0.8)',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,   // radius for count < 10
          10,   // count >= 10
          25,   // radius for count < 50
          50,   // count >= 50
          30    // radius for count >= 50
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add cluster count labels
    map.addLayer({
      id: 'photo-cluster-count',
      type: 'symbol',
      source: 'photos',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 14
      },
      paint: {
        'text-color': '#000000'
      }
    });

    return () => {
      // Cleanup
      if (map.getLayer('photo-cluster-count')) {
        map.removeLayer('photo-cluster-count');
      }
      if (map.getLayer('photo-clusters')) {
        map.removeLayer('photo-clusters');
      }
      if (map.getSource('photos')) {
        map.removeSource('photos');
      }
    };
  }, [map, photos]);

  // Add zoom change listener
  useEffect(() => {
    if (!map) return;

    const handleZoomChange = () => {
      const zoom = map.getZoom() ?? 0;
      console.log('[PhotoLayer] Zoom changed:', zoom);
      console.log('[PhotoLayer] Should show markers:', zoom >= CLUSTER_MAX_ZOOM);
    };

    map.on('zoom', handleZoomChange);

    return () => {
      map.off('zoom', handleZoomChange);
    };
  }, [map]);

  // Handle cluster click
  useEffect(() => {
    if (!map) return;

    const handleClusterClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['photo-clusters']
      });

      const clusterId = features[0]?.properties?.cluster_id;
      if (!clusterId) return;

      // Get cluster expansion zoom
      const source = map.getSource('photos') as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        const geometry = features[0]?.geometry;
        if (!geometry || zoom === undefined) return;

        map.easeTo({
          center: (geometry as any).coordinates,
          zoom: Math.min(zoom, 22) // Ensure zoom is within valid range
        });
      });
    };

    map.on('click', 'photo-clusters', handleClusterClick);

    return () => {
      map.off('click', 'photo-clusters', handleClusterClick);
    };
  }, [map]);

  // Helper function to safely get zoom level
  const shouldShowMarkers = (): boolean => {
    if (!map) return false;
    const mapInstance = map as mapboxgl.Map & { transform?: { zoom: number } };
    const zoom = mapInstance.transform?.zoom ?? 0;
    return zoom >= CLUSTER_MAX_ZOOM;
  };

  return (
    <>
      {photos
        .filter(p => p.coordinates && shouldShowMarkers())
        .map(photo => (
          <PhotoMarker
            key={photo.id}
            photo={photo}
            onClick={() => setSelectedPhoto(photo)}
          />
        ))}

      {selectedPhoto && (
        <PhotoPreviewModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
};
