import React, { useEffect, useState, useRef } from 'react';
import { useMapContext } from '../../context/MapContext';
import { detectClimbs } from '../../../gpx/utils/climbUtils';
import mapboxgl from 'mapbox-gl';
import { PresentationClimbViewer } from '../../../../features/presentation/components/ClimbViewer/PresentationClimbViewer';
import { reverseGeocodeForRoad } from '../../../../utils/geocoding';
import './ClimbMarkers.css';

export const ClimbMarkers = ({ map, route }) => {
    const [markers, setMarkers] = useState([]);
    const { hoverCoordinates } = useMapContext();
    const popupRef = useRef(null);
    const [selectedClimb, setSelectedClimb] = useState(null);

    useEffect(() => {
        // Clean up markers when component unmounts or route changes
        return () => {
            markers.forEach(marker => marker.remove());
            if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
            }
        };
    }, [markers]);

    useEffect(() => {
        // Skip if map or route is not available
        if (!map || !route || !route.geojson || route.error) {
            return;
        }

        // Clean up existing markers
        markers.forEach(marker => marker.remove());
        setMarkers([]);
        
        if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
        }

        try {
            // Extract elevation data from route
            const feature = route.geojson.features[0];
            if (feature.geometry.type !== 'LineString') {
                return;
            }

            const elevations = feature.properties?.coordinateProperties?.elevation;
            const routeCoordinates = feature.geometry.coordinates;
            const totalDistance = route.statistics.totalDistance;

            if (!Array.isArray(elevations) || !Array.isArray(routeCoordinates)) {
                return;
            }

            // We'll skip the old elevation data calculation and use only the ElevationProfile approach
            
            // Create elevation data in the same format as the ElevationProfile component
            const elevationProfileData = [];
            
            // Calculate cumulative distances for each point
            const cumulativeDistances = [0]; // First point is at distance 0
            let totalDistanceCalculated = 0;
            
            // Calculate distance between two points using Haversine formula
            const calculateDistance = (point1, point2) => {
                const [lon1, lat1] = point1;
                const [lon2, lat2] = point2;
                
                // Convert to radians
                const toRad = (value) => value * Math.PI / 180;
                const φ1 = toRad(lat1);
                const φ2 = toRad(lat2);
                const Δφ = toRad(lat2 - lat1);
                const Δλ = toRad(lon2 - lon1);
                
                // Haversine formula
                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                          Math.cos(φ1) * Math.cos(φ2) *
                          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                
                // Earth's radius in meters
                const R = 6371e3;
                return R * c;
            };
            
            // Calculate cumulative distances
            for (let j = 1; j < routeCoordinates.length; j++) {
                const distance = calculateDistance(routeCoordinates[j-1], routeCoordinates[j]);
                totalDistanceCalculated += distance;
                cumulativeDistances.push(totalDistanceCalculated);
            }
            
            // Create elevation data with accurate distances - exactly like in ElevationProfile.tsx
            for (let k = 0; k < elevations.length; k++) {
                // Use the actual distance for this point, or interpolate if needed
                const distanceIndex = Math.min(k, cumulativeDistances.length - 1);
                elevationProfileData.push({
                    distance: cumulativeDistances[distanceIndex],
                    elevation: elevations[k]
                });
            }
            
            // Detect climbs using the same data format as ElevationProfile.tsx
            const climbs = detectClimbs(elevationProfileData);
            
            // Sort climbs by distance to get them in route order
            const sortedClimbs = [...climbs].sort((a, b) => a.startPoint.distance - b.startPoint.distance);
            
            // Assign numbers within each category
            const categoryCount = {};
            sortedClimbs.forEach(climb => {
                categoryCount[climb.category] = (categoryCount[climb.category] || 0) + 1;
                climb.number = categoryCount[climb.category];
            });
            
            console.log('[ClimbMarkers] Detected climbs using elevation profile format:', sortedClimbs);

            // Create markers for each climb
            const newMarkers = [];
            const initialZoom = Math.floor(map.getZoom());

            // Update zoom handler function
            const updateZoom = () => {
                const zoom = Math.floor(map.getZoom());
                newMarkers.forEach(marker => {
                    const el = marker.getElement();
                    if (el) {
                        el.setAttribute('data-zoom', zoom.toString());
                    }
                });
            };
            
            // Add zoom event listener
            map.on('zoom', updateZoom);

            sortedClimbs.forEach(climb => {
                // Find the coordinates for start and end points
                const startDistanceRatio = climb.startPoint.distance / totalDistance;
                const endDistanceRatio = climb.endPoint.distance / totalDistance;
                
                const startIndex = Math.floor(startDistanceRatio * (routeCoordinates.length - 1));
                const endIndex = Math.floor(endDistanceRatio * (routeCoordinates.length - 1));
                
                const startCoord = routeCoordinates[startIndex];
                const endCoord = routeCoordinates[endIndex];
                
                if (!startCoord || !endCoord) {
                    return;
                }
                
                // Get road name for the climb using reverse geocoding
                // We'll use an async function but not await it to avoid blocking the UI
                reverseGeocodeForRoad(startCoord)
                    .then(roadName => {
                        if (roadName) {
                            // Add the road name to the climb object
                            climb.roadName = roadName;
                            // console.log(`[ClimbMarkers] Found road name for climb: ${roadName}`);
                        }
                    })
                    .catch(error => {
                        console.error('[ClimbMarkers] Error getting road name:', error);
                    });

                // Calculate climb stats
                const distance = (climb.endPoint.distance - climb.startPoint.distance) / 1000; // km
                const elevation = climb.endPoint.elevation - climb.startPoint.elevation; // m
                const gradient = ((elevation / (distance * 1000)) * 100).toFixed(1); // %
                const color = climb.color.replace('99', 'ff');

                // Create tooltip content - simplified with no white background
                const tooltipContent = `
                    <div style="
                        background: rgba(30, 30, 30, 0.95);
                        padding: 8px 12px;
                        border-radius: 8px;
                        font-family: Futura, sans-serif;
                        font-size: 12px;
                        color: white;
                        min-width: 120px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    ">
                        <div style="
                            margin-bottom: 4px;
                            color: ${color};
                            display: flex;
                            align-items: center;
                            gap: 4px;
                        ">
                            ${climb.category} ${climb.category === 'HC' ? '<i class="fa-regular fa-skull-crossbones"></i>' : ''}
                        </div>
                        <div style="
                            display: flex;
                            flex-direction: column;
                            gap: 4px;
                            color: rgba(255,255,255,0.7);
                            margin-top: 8px;
                        ">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-route" style="font-size: 11px; color: #0288d1; width: 14px;"></i>
                                <span>${distance.toFixed(1)} km</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-mountains" style="font-size: 11px; color: #0288d1; width: 14px;"></i>
                                <span>${elevation.toFixed(0)} m</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-angle" style="font-size: 11px; color: #0288d1; width: 14px;"></i>
                                <span>${gradient}%</span>
                            </div>
                        </div>
                    </div>
                `;

                // Calculate the bearing (direction) between start and end points
                const calculateBearing = (start, end) => {
                    const startLat = start[1] * Math.PI / 180;
                    const startLng = start[0] * Math.PI / 180;
                    const endLat = end[1] * Math.PI / 180;
                    const endLng = end[0] * Math.PI / 180;
                    
                    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
                    const x = Math.cos(startLat) * Math.sin(endLat) -
                            Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
                    
                    let bearing = Math.atan2(y, x) * 180 / Math.PI;
                    bearing = (bearing + 360) % 360;
                    
                    return bearing;
                };
                
                // Calculate the bearing of the climb
                const bearing = calculateBearing(startCoord, endCoord);
                
                // Create HTML for the start flag - always pointing in direction of travel
                const startEl = document.createElement('div');
                startEl.className = 'climb-marker';
                startEl.setAttribute('data-zoom', initialZoom.toString());
                
                // For start flag, we want it pointing in the direction of travel (same as bearing)
                // If bearing is between 0-180, the flag should point right (east-ish)
                // If bearing is between 180-360, the flag should point left (west-ish)
                const startFlagPointsRight = bearing < 180;
                
                if (startFlagPointsRight) {
                    // Start flag points right (in direction of travel)
                    startEl.innerHTML = `
                        <div class="climb-marker-container">
                            <div class="climb-flag climb-flag-start">
                                <div class="climb-flag-category" style="color: ${color}">${climb.category}</div>
                                <div class="climb-flag-pole" style="background-color: ${color}"></div>
                                <div class="climb-flag-banner" style="border-left-color: ${color}"></div>
                            </div>
                        </div>
                    `;
                } else {
                    // Start flag points left (in direction of travel)
                    startEl.innerHTML = `
                        <div class="climb-marker-container">
                            <div class="climb-flag climb-flag-end">
                                <div class="climb-flag-banner" style="border-right-color: ${color}"></div>
                                <div class="climb-flag-pole" style="background-color: ${color}"></div>
                                <div class="climb-flag-category" style="color: ${color}">${climb.category}</div>
                            </div>
                        </div>
                    `;
                }

                // Create HTML for the end flag - always pointing against direction of travel
                const endEl = document.createElement('div');
                endEl.className = 'climb-marker';
                endEl.setAttribute('data-zoom', initialZoom.toString());
                
                // For end flag, we want it pointing against the direction of travel (opposite of bearing)
                // If bearing is between 0-180, the flag should point left (west-ish)
                // If bearing is between 180-360, the flag should point right (east-ish)
                if (!startFlagPointsRight) {
                    // End flag points right (against direction of travel)
                    endEl.innerHTML = `
                        <div class="climb-marker-container">
                            <div class="climb-flag climb-flag-start">
                                <div class="climb-flag-category" style="color: ${color}">END</div>
                                <div class="climb-flag-pole" style="background-color: ${color}"></div>
                                <div class="climb-flag-banner" style="border-left-color: ${color}"></div>
                            </div>
                        </div>
                    `;
                } else {
                    // End flag points left (against direction of travel)
                    endEl.innerHTML = `
                        <div class="climb-marker-container">
                            <div class="climb-flag climb-flag-end">
                                <div class="climb-flag-banner" style="border-right-color: ${color}"></div>
                                <div class="climb-flag-pole" style="background-color: ${color}"></div>
                                <div class="climb-flag-category" style="color: ${color}">END</div>
                            </div>
                        </div>
                    `;
                }

                // Create start marker
                const startMarker = new mapboxgl.Marker({
                    element: startEl,
                    anchor: 'center',
                    rotationAlignment: 'viewport',
                    pitchAlignment: 'viewport'
                })
                .setLngLat(startCoord)
                .addTo(map);

                // Create end marker
                const endMarker = new mapboxgl.Marker({
                    element: endEl,
                    anchor: 'center',
                    rotationAlignment: 'viewport',
                    pitchAlignment: 'viewport'
                })
                .setLngLat(endCoord)
                .addTo(map);

                // Add click event to show the climb viewer modal with improved mobile handling
                const handleClimbClick = (e) => {
                    // Stop propagation to prevent map from capturing the event
                    e.stopPropagation();
                    
                    // Prevent default behavior
                    e.preventDefault();
                    
                    // Immediately set the selected climb without requiring a second click
                    setSelectedClimb(climb);
                };
                
                // Add event listeners to both start and end markers
                startEl.addEventListener('click', handleClimbClick);
                endEl.addEventListener('click', handleClimbClick);
                

                newMarkers.push(startMarker, endMarker);
            });

            setMarkers(newMarkers);
            
            // Clean up event listeners when component unmounts or route changes
            return () => {
                map.off('zoom', updateZoom);
            };
        } catch (error) {
            console.error('[ClimbMarkers] Error creating climb markers:', error);
        }
    }, [map, route]);

    // Use React.createElement instead of JSX since this is a .js file
    return selectedClimb ? 
        React.createElement(PresentationClimbViewer, {
            climb: selectedClimb,
            route: route,
            onClose: () => setSelectedClimb(null)
        }) : 
        null;
};

export default ClimbMarkers;
