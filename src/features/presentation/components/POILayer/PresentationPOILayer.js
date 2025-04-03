import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useRouteContext } from '../../../map/context/RouteContext';
import { usePOIContext } from '../../../poi/context/POIContext';
import { POI_CATEGORIES } from '../../../poi/types/poi.types';
import { getIconDefinition } from '../../../poi/constants/poi-icons';
import { ICON_PATHS } from '../../../poi/constants/icon-paths';
import { calculatePOIPositions } from '../../../poi/utils/placeDetection';
import { isCluster } from '../../../poi/utils/clustering';
import { clusterPOIsGeographically } from '../../../poi/utils/geographicClustering';
import { PresentationPOIViewer } from '../POIViewer';
import POICluster from '../../../poi/components/POICluster/POICluster';
import MapboxPOIMarker from '../../../poi/components/MapboxPOIMarker/MapboxPOIMarker';
import logger from '../../../../utils/logger';
import './PresentationPOILayer.css';
export const PresentationPOILayer = ({ map, onSelectPOI }) => {
    const { currentRoute } = useRouteContext();
    const { loadPOIsFromRoute, getPOIsForRoute, visibleCategories } = usePOIContext();
    const markersRef = useRef([]);
    const placeMarkersRef = useRef([]);
    const [selectedPOI, setSelectedPOI] = useState(null);
    const [zoom, setZoom] = useState(null);
    const [clusteredItems, setClusteredItems] = useState([]);
    // Effect to handle POIs visibility and clustering based on zoom with throttling
    useEffect(() => {
        if (!map)
            return;
            
        let lastZoomUpdate = 0;
        const THROTTLE_MS = 150; // Minimum ms between updates
        
        const handleZoom = () => {
            const now = Date.now();
            if (now - lastZoomUpdate < THROTTLE_MS) return;
            
            lastZoomUpdate = now;
            const currentZoom = map.getZoom();
            
            // Only update if zoom changed significantly (0.5 levels)
            if (zoom === null || Math.abs(currentZoom - zoom) >= 0.5) {
                setZoom(currentZoom);
                
                // Use requestAnimationFrame to batch DOM updates
                requestAnimationFrame(() => {
                    // Update zoom level for regular POIs
                    markersRef.current.forEach(({ marker }) => {
                        const markerElement = marker.getElement();
                        const container = markerElement.querySelector('.marker-container');
                        if (container) {
                            container.setAttribute('data-zoom', Math.floor(currentZoom).toString());
                        }
                    });
                    
                    // Place POI functionality is commented out
                    /*
                    // Show/hide place markers based on zoom level
                    placeMarkersRef.current.forEach(({ marker }) => {
                        if (currentZoom > 8.071) {
                            marker.addTo(map);
                        }
                        else {
                            marker.remove();
                        }
                    });
                    */
                });
            }
        };
        
        map.on('zoom', handleZoom);
        handleZoom(); // Initial check
        
        return () => {
            map.off('zoom', handleZoom);
        };
    }, [map, zoom]);
    // Load POIs when route changes
    useEffect(() => {
        if (!currentRoute || currentRoute._type !== 'loaded' || !currentRoute._loadedState?.pois) {
            return;
        }
        loadPOIsFromRoute(currentRoute._loadedState.pois);
    }, [currentRoute]); // Remove loadPOIsFromRoute from deps since it's a stable context function
    // Use rounded zoom level to reduce recalculations
    const roundedZoom = useMemo(() => {
        if (zoom === null) return null;
        return Math.floor(zoom * 2) / 2; // Round to nearest 0.5
    }, [zoom]);
    
    // Use zoom-dependent geographic clustering
    useEffect(() => {
        if (!map || zoom === null) return;

        console.log('[PresentationPOILayer] 🔄 Creating geographic POI clusters at zoom level:', zoom);
        console.time('poiClustering');

        // Get all draggable POIs filtered by visible categories
        const allPOIs = getPOIsForRoute();
        console.log('[PresentationPOILayer] Total POIs:', {
            draggable: allPOIs.draggable.length,
            places: allPOIs.places?.length || 0
        });
        
        const filteredPOIs = allPOIs.draggable.filter(poi => visibleCategories.includes(poi.category));
        console.log('[PresentationPOILayer] Filtered POIs for clustering:', filteredPOIs.length);
        
        // Detect if device is mobile
        const isMobile = window.innerWidth <= 768;
        
        // Adjust distance threshold based on zoom level
        let distanceThreshold;
        if (zoom < 8) {
            distanceThreshold = isMobile ? 1000 : 800; // Far zoom - large clusters
            console.log('[PresentationPOILayer] Using large distance threshold:', distanceThreshold);
        } else if (zoom < 12) {
            distanceThreshold = isMobile ? 500 : 400; // Medium zoom - medium clusters
            console.log('[PresentationPOILayer] Using medium distance threshold:', distanceThreshold);
        } else if (zoom < 15) {
            distanceThreshold = isMobile ? 200 : 150; // Close zoom - small clusters
            console.log('[PresentationPOILayer] Using small distance threshold:', distanceThreshold);
        } else {
            distanceThreshold = 0; // Very close zoom - no clustering
            console.log('[PresentationPOILayer] No clustering at high zoom level');
        }
        
        // Use geographic clustering with zoom-dependent distance threshold
        const clusters = clusterPOIsGeographically(filteredPOIs, {
            distanceThreshold,
            isMobile
        });
        
        console.log('[PresentationPOILayer] Geographic clustering result:', {
            totalItems: clusters.length,
            clusters: clusters.filter(item => isCluster(item)).length,
            individualPOIs: clusters.filter(item => !isCluster(item)).length
        });
        
        setClusteredItems(clusters);
        console.timeEnd('poiClustering');
    }, [map, zoom, visibleCategories, getPOIsForRoute]); // Add zoom as dependency

    // Handle cluster click - modified for geographic clusters
    const handleClusterClick = (cluster) => {
        if (!map) return;
        
        // Get the cluster's coordinates
        const [lng, lat] = cluster.geometry.coordinates;
        
        // For geographic clusters, we use a fixed zoom increase
        const currentZoom = map.getZoom();
        const targetZoom = Math.min(currentZoom + 2, 18); // Add 2 zoom levels, but cap at 18
        
        // Detect if device is mobile for smoother performance
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // On mobile, just jump to the new zoom level without animation
            map.jumpTo({
                center: [lng, lat],
                zoom: targetZoom
            });
        } else {
            // On desktop, use smooth animation
            map.easeTo({
                center: [lng, lat],
                zoom: targetZoom
            });
        }
    };

    // Memoize POI data to prevent unnecessary recalculations
    // Memoize POI data based on the actual POIs from context and filter by visible categories
    const poiData = useMemo(() => {
        console.log('[PresentationPOILayer] 🔄 Recalculating POI data');
        console.time('poiDataMemo');
        
        const allPOIs = getPOIsForRoute();
        const result = {
            draggable: allPOIs.draggable.filter(poi => visibleCategories.includes(poi.category)),
            places: [] // Place POI functionality is commented out
        };
        
        console.log('[PresentationPOILayer] Filtered POI data:', {
            draggable: result.draggable.length,
            places: result.places.length
        });
        
        console.timeEnd('poiDataMemo');
        return result;
    }, [visibleCategories, getPOIsForRoute]); // Only update when visible categories change, not on every getPOIsForRoute call
    // Memoize marker creation function
    const createMarker = useCallback((poi) => {
        const el = document.createElement('div');
        el.className = 'poi-marker';
        const iconDefinition = getIconDefinition(poi.icon);
        // Add fallback color in case the category doesn't exist in POI_CATEGORIES
        const markerColor = iconDefinition?.style?.color || 
                           (POI_CATEGORIES[poi.category]?.color) || 
                           '#777777'; // Default gray color if category not found
        // Set up marker HTML with bubble-pin style and initial zoom level
        const initialZoom = Math.floor(map.getZoom());
        
        // Special handling for HC icon which has two icons side by side
        const iconContent = poi.icon === 'ClimbHC' 
          ? `<span style="font-size: 14px; color: white;"><i class="fa-solid fa-h"></i><i class="fa-solid fa-c"></i></span>`
          : `<i class="${ICON_PATHS[poi.icon]} marker-icon"></i>`;
          
        el.innerHTML = `
      <div class="marker-container" data-zoom="${initialZoom}">
        <div class="marker-bubble" style="background-color: ${markerColor}">
          ${iconContent}
        </div>
        <div class="marker-point" style="border-top-color: ${markerColor}"></div>
      </div>
    `;
        // Create marker with viewport alignment - always non-draggable in presentation mode
        const marker = new mapboxgl.Marker({
            element: el,
            draggable: false, // Explicitly set to false for presentation mode
            rotationAlignment: 'viewport',
            pitchAlignment: 'viewport',
            anchor: 'center',
            offset: [0, -20] // Half the height of marker-bubble to center it (adjusted for larger size)
        })
            .setLngLat(poi.coordinates)
            .addTo(map);
        // Add click handler to show drawer with improved event handling for mobile
        el.addEventListener('click', (e) => {
            // Stop propagation to prevent map from capturing the event
            e.stopPropagation();
            
            // Prevent default behavior
            e.preventDefault();
            
            // Immediately handle the POI selection
            if (onSelectPOI) {
                onSelectPOI(poi);
            } else {
                setSelectedPOI(poi);
            }
        });
        // Add hover effect
        el.addEventListener('mouseenter', () => {
            const bubble = el.querySelector('.marker-bubble');
            if (bubble) {
                bubble.style.transform = 'scale(1.1)';
                bubble.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.3)';
            }
        });
        el.addEventListener('mouseleave', () => {
            const bubble = el.querySelector('.marker-bubble');
            if (bubble) {
                bubble.style.transform = '';
                bubble.style.boxShadow = '';
            }
        });
        return { marker, poiId: poi.id };
    }, [map, setSelectedPOI, onSelectPOI]);
    // Effect to update markers when POI data changes - only used when not clustering
    useEffect(() => {
        if (!map || clusteredItems.length > 0) {
            console.log('[PresentationPOILayer] ⏭️ Skipping marker creation - using clustering or no map');
            return;
        }
            
        console.log('[PresentationPOILayer] 🔄 Creating individual POI markers');
        console.time('markerCreation');
            
        // Clear existing markers
        console.log('[PresentationPOILayer] Removing', markersRef.current.length, 'existing markers');
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];
        
        // Handle regular POIs
        console.log('[PresentationPOILayer] Creating', poiData.draggable.length, 'POI markers');
        poiData.draggable.forEach((poi) => {
            const markerRef = createMarker(poi);
            markersRef.current.push(markerRef);
        });
        
        console.log('[PresentationPOILayer] ✅ Created', markersRef.current.length, 'POI markers');
        console.timeEnd('markerCreation');
        // Place POI functionality is commented out
        /*
        // Group place POIs by coordinates
        const poiGroups = poiData.places.reduce((acc, poi) => {
            const key = `${poi.coordinates[0]},${poi.coordinates[1]}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(poi);
            return acc;
        }, {});
        // Create markers for each location's POIs
        Object.entries(poiGroups).forEach(([coordKey, locationPois]) => {
            const [lng, lat] = coordKey.split(',').map(Number);
            const baseOffset = 9; // Fixed offset for place POIs, just like in creation mode
            // Calculate positions for all icons including plus badge if needed
            const totalPositions = locationPois.length > 3 ? 4 : locationPois.length;
            const positions = calculatePOIPositions({
                id: coordKey,
                name: locationPois[0].name,
                coordinates: [lng, lat]
            }, totalPositions, {
                iconSize: 20, // Increased to match larger POI size
                spacing: 12, // Further increased spacing for better separation
                maxPerRow: 4,
                baseOffset
            });
            // Only show first 3 POIs
            const visiblePois = locationPois.slice(0, 3);
            const remainingCount = locationPois.length - 3;
            // Create markers for visible POIs
            visiblePois.forEach((poi, index) => {
                const position = positions[index];
                if (!position)
                    return;
                // Create marker element without any zoom-based attributes for place POIs
                const el = document.createElement('div');
                el.className = 'mapboxgl-marker poi-marker';
                const container = document.createElement('div');
                container.className = 'poi-marker';
                const icon = document.createElement('i');
                icon.className = `poi-icon ${ICON_PATHS[poi.icon]}`;
                container.appendChild(icon);
                el.appendChild(container);
                // Create and add marker with same configuration as creation mode
                const marker = new mapboxgl.Marker({
                    element: el,
                    anchor: 'bottom',
                    offset: position.offset,
                    rotation: 0,
                    rotationAlignment: 'viewport',
                    pitchAlignment: 'viewport'
                })
                    .setLngLat(position.coordinates);
                // Add click handler to show drawer
                el.addEventListener('click', () => {
                    if (onSelectPOI) {
                        onSelectPOI(poi);
                    } else {
                        setSelectedPOI(poi);
                    }
                });
                // Only add marker if we're zoomed in enough
                if (map.getZoom() > 8.071) {
                    marker.addTo(map);
                }
                placeMarkersRef.current.push({ marker, poiId: poi.id });
            });
            // Add plus badge if there are more POIs
            if (remainingCount > 0) {
                const plusPosition = positions[3];
                if (plusPosition) {
                    // Create plus badge marker without any zoom-based attributes
                    const el = document.createElement('div');
                    el.className = 'mapboxgl-marker poi-marker';
                    const container = document.createElement('div');
                    container.className = 'poi-marker plus-badge';
                    container.textContent = `+${remainingCount}`;
                    el.appendChild(container);
                    // Create and add marker with same configuration as creation mode
                    const marker = new mapboxgl.Marker({
                        element: el,
                        anchor: 'bottom',
                        offset: plusPosition.offset,
                        rotation: 0,
                        rotationAlignment: 'viewport',
                        pitchAlignment: 'viewport'
                    })
                        .setLngLat(plusPosition.coordinates);
                    // Only add marker if we're zoomed in enough
                    if (map.getZoom() > 8.071) {
                        marker.addTo(map);
                    }
                    placeMarkersRef.current.push({ marker, poiId: 'plus-badge' });
                }
            }
        });
        */
        return () => {
            markersRef.current.forEach(({ marker }) => marker.remove());
            markersRef.current = [];
            placeMarkersRef.current.forEach(({ marker }) => marker.remove());
            placeMarkersRef.current = [];
        };
    }, [map, poiData, createMarker]); // Use memoized poiData instead of getPOIsForRoute
    // Prepare rendered items based on clustered items
    const renderedItems = [];
    
    if (clusteredItems.length > 0) {
        // Render clusters and individual POIs
        for (let i = 0; i < clusteredItems.length; i++) {
            const item = clusteredItems[i];
            if (isCluster(item)) {
                renderedItems.push(
                    _jsx(POICluster, {
                        cluster: item,
                        onClick: () => handleClusterClick(item),
                        key: `cluster-${item.properties.cluster_id}`
                    })
                );
            } else {
                renderedItems.push(
                    _jsx(MapboxPOIMarker, {
                        poi: item.properties.poi,
                        forceDraggable: false, // Force POIs to be non-draggable in presentation mode
                        onClick: (poi) => {
                            logger.info('PresentationPOILayer', 'POI clicked:', poi);
                            // Ensure we're using the original POI object, not the transformed GeoJSON feature
                            const originalPoi = item.properties.poi;
                            if (onSelectPOI) {
                                logger.info('PresentationPOILayer', 'Using onSelectPOI');
                                onSelectPOI(originalPoi);
                            } else {
                                logger.info('PresentationPOILayer', 'Using setSelectedPOI');
                                setSelectedPOI(originalPoi);
                            }
                        },
                        key: `poi-${item.properties.id}`
                    })
                );
            }
        }
    }
    
    // Always render the POI viewer if needed, regardless of clustering
    if (!onSelectPOI && selectedPOI) {
        logger.info('PresentationPOILayer', 'Rendering PresentationPOIViewer with POI:', selectedPOI);
        return [
            ...renderedItems,
            _jsx(PresentationPOIViewer, {
                poi: selectedPOI,
                onClose: () => setSelectedPOI(null),
                key: 'poi-viewer'
            })
        ];
    }
    
    return renderedItems.length > 0 ? renderedItems : null;
};
