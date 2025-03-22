import React, { useState, useMemo, useRef } from 'react';
import { Box, IconButton, Typography, Modal } from '@mui/material';
import { Close } from '@mui/icons-material';
import { ImageSlider } from '../ImageSlider/ImageSlider';
import { ResponsiveLine } from '@nivo/line';

export const PresentationClimbViewer = ({ climb, route, onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentProfilePoint, setCurrentProfilePoint] = useState(null);
  const [currentGradient, setCurrentGradient] = useState(0);
  const chartRef = useRef(null);
  
  if (!climb || !route) return null;
  
  // Calculate climb statistics
  const distance = (climb.endPoint.distance - climb.startPoint.distance) / 1000; // km
  const elevation = climb.endPoint.elevation - climb.startPoint.elevation; // m
  const gradient = ((elevation / (distance * 1000)) * 100).toFixed(1); // %
  const color = climb.color.replace('99', 'ff'); // Make color fully opaque
  
  // Find the coordinates for start and end points of the climb
  const startDistanceRatio = climb.startPoint.distance / route.statistics.totalDistance;
  const endDistanceRatio = climb.endPoint.distance / route.statistics.totalDistance;
  
  const feature = route.geojson.features[0];
  const coordinates = feature.geometry.coordinates;
  
  const startIndex = Math.floor(startDistanceRatio * (coordinates.length - 1));
  const endIndex = Math.floor(endDistanceRatio * (coordinates.length - 1));
  
  const startCoord = coordinates[startIndex];
  
  // Calculate the middle point of the climb for better centering
  const middleIndex = Math.floor((startIndex + endIndex) / 2);
  const middleCoord = coordinates[middleIndex];
  
  // Create a modified route object that only includes the climb segment
  const climbRoute = {
    ...route,
    geojson: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates.slice(startIndex, endIndex + 1)
          }
        }
      ]
    },
    // Add custom properties to control the map view
    customMapOptions: {
      minZoom: 15,
      maxZoom: 18,
      disableFitBounds: true // Prevent automatic fitting of bounds
    }
  };
  
  // Create mapPreviewProps for the ImageSlider
  const mapPreviewProps = {
    center: middleCoord, // Use the middle of the climb as center for better view
    zoom: 12, // Lower zoom level to show more of the map
    routes: [climbRoute], // Show only the climb segment
    disableFitBounds: false // Enable automatic fitting of bounds to show the full segment
  };
  
  // Create elevation profile data for the climb segment
  const elevationProfileData = useMemo(() => {
    if (!climb || !route?.geojson?.features?.[0]?.properties?.coordinateProperties?.elevation) {
      return [];
    }

    const feature = route.geojson.features[0];
    if (feature.geometry.type !== 'LineString') {
      return [];
    }

    const elevations = feature.properties?.coordinateProperties?.elevation;
    if (!Array.isArray(elevations)) {
      return [];
    }

    const coordinates = feature.geometry.coordinates;
    const totalDistance = route.statistics.totalDistance;
    const pointCount = elevations.length;

    // Find the indices for the start and end points of the climb
    const startIndex = Math.floor((climb.startPoint.distance / totalDistance) * (pointCount - 1));
    const endIndex = Math.floor((climb.endPoint.distance / totalDistance) * (pointCount - 1));

    // Create data points for the climb segment only
    const data = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const distance = (i / (pointCount - 1)) * totalDistance;
      const distanceFromStart = distance - climb.startPoint.distance;
      const elevation = elevations[i];
      
      data.push({
        x: distanceFromStart / 1000, // Convert to km from start of climb
        y: elevation
      });
    }

    return [
      {
        id: 'elevation',
        data,
        color: climb.color.replace('99', 'ff') // Make color fully opaque
      }
    ];
  }, [climb, route]);


  return (
    <Modal 
      open={Boolean(climb)} 
      onClose={onClose}
      aria-labelledby="climb-viewer-modal"
      disableScrollLock={true}
      disableAutoFocus={true}
      keepMounted={true}
      sx={{ 
        zIndex: 9999,
        '& .MuiBackdrop-root': {
          position: 'absolute'
        }
      }}
    >
      <Box 
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '500px',
          height: 'auto',
          maxHeight: '90vh',
          bgcolor: 'rgba(35, 35, 35, 0.95)',
          border: '1px solid rgba(30, 136, 229, 0.5)',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999
        }}
      >
        {/* Header with name and close button */}
        <Box
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" color="white" sx={{ color }}>
              {climb.category} Climb
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <Close />
          </IconButton>
        </Box>
        
        {/* Image slider with map */}
        <Box 
          sx={{ 
            height: '250px', 
            mb: 3,
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <ImageSlider 
            photos={[]} 
            mapPreviewProps={mapPreviewProps}
            alwaysShowMap={true} // Always show the map preview
          />
        </Box>
        
        {/* Compact climb statistics */}
        <Box 
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: '4px',
            backgroundColor: 'rgba(45, 45, 45, 0.9)',
          }}
        >
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: 1.5,
            fontSize: '0.85rem'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fa-solid fa-route" style={{ fontSize: '14px', color: '#0288d1', width: '16px' }}></i>
              <Typography variant="body2" color="white">
                Distance: {distance.toFixed(1)} km
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fa-solid fa-mountains" style={{ fontSize: '14px', color: '#0288d1', width: '16px' }}></i>
              <Typography variant="body2" color="white">
                Elevation: {elevation.toFixed(0)} m
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fa-solid fa-angle" style={{ fontSize: '14px', color: '#0288d1', width: '16px' }}></i>
              <Typography variant="body2" color="white">
                Gradient: {gradient}%
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <i className="fa-solid fa-ranking-star" style={{ fontSize: '14px', color: '#0288d1', width: '16px' }}></i>
              <Typography variant="body2" color="white">
                FIETS: {climb.fietsScore.toFixed(1)}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        {/* Elevation profile for the climb */}
        <Box 
          sx={{ 
            height: '300px', 
            mb: 3,
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'rgba(45, 45, 45, 0.9)',
          }}
        >
          {elevationProfileData.length > 0 ? (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
              {/* Main elevation profile with mouse interaction */}
              <Box 
                ref={chartRef}
                sx={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '100%',
                  '& > div': { position: 'relative' }
                }}
                onMouseMove={(e) => {
                  if (!elevationProfileData.length || !chartRef.current) return;
                  
                  // Get chart dimensions and position
                  const chartRect = chartRef.current.getBoundingClientRect();
                  const chartWidth = chartRect.width - 70; // Adjust for margins
                  const chartHeight = chartRect.height - 90; // Adjust for margins
                  const chartLeft = 50; // Left margin
                  const chartTop = 20; // Top margin
                  
                  // Calculate relative position within chart area
                  const relativeX = e.clientX - chartRect.left - chartLeft;
                  const relativeXRatio = Math.max(0, Math.min(1, relativeX / chartWidth));
                  
                  // Get data point closest to mouse position
                  const points = elevationProfileData[0].data;
                  const xMax = Math.max(...points.map(d => d.x));
                  const xValue = relativeXRatio * xMax;
                  
                  // Find closest point
                  let closestPoint = points[0];
                  let minDistance = Math.abs(closestPoint.x - xValue);
                  
                  for (let i = 1; i < points.length; i++) {
                    const distance = Math.abs(points[i].x - xValue);
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestPoint = points[i];
                    }
                  }
                  
                  // Calculate gradient at this point
                  let gradient = 0;
                  const pointIndex = points.findIndex(p => p === closestPoint);
                  
                  if (pointIndex < points.length - 1) {
                    const nextPoint = points[pointIndex + 1];
                    const distanceMeters = (nextPoint.x - closestPoint.x) * 1000;
                    const elevationChange = nextPoint.y - closestPoint.y;
                    gradient = distanceMeters > 0 ? (elevationChange / distanceMeters) * 100 : 0;
                  }
                  
                  setCurrentProfilePoint(closestPoint);
                  setCurrentGradient(gradient);
                }}
                onMouseLeave={() => {
                  setCurrentProfilePoint(null);
                }}
              >
                <ResponsiveLine
                  data={elevationProfileData}
                  margin={{ top: 20, right: 20, bottom: 70, left: 50 }}
                  xScale={{ 
                    type: 'linear', 
                    min: 0,
                    max: 'auto'
                  }}
                  yScale={{ 
                    type: 'linear',
                    min: Math.floor(Math.min(...elevationProfileData[0].data.map(d => d.y)) / 20) * 20,
                    max: Math.ceil(Math.max(...elevationProfileData[0].data.map(d => d.y)) / 20) * 20
                  }}
                  curve="monotoneX"
                  enableArea={true}
                  areaBaselineValue={Math.floor(Math.min(...elevationProfileData[0].data.map(d => d.y)) / 20) * 20}
                  areaOpacity={0.5}
                  enablePoints={false}
                  enableGridX={true}
                  enableGridY={true}
                  axisBottom={{
                    orient: 'bottom',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: Array.from({ length: 6 }, (_, i) => i * (distance / 5)),
                    format: d => d.toFixed(1),
                    legend: 'Distance (km)',
                    legendOffset: 50,
                    legendPosition: 'middle'
                  }}
                  axisLeft={{
                    orient: 'left',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    format: d => Math.round(d),
                    legend: 'Elevation (m)',
                    legendOffset: -40,
                    legendPosition: 'middle'
                  }}
                  colors={[climb.color.replace('99', 'ff')]}
                  theme={{
                    axis: {
                      domain: {
                        line: {
                          stroke: 'rgba(255, 255, 255, 0.3)',
                          strokeWidth: 1
                        }
                      },
                      ticks: {
                        line: {
                          stroke: 'rgba(255, 255, 255, 0.3)',
                          strokeWidth: 1
                        },
                        text: {
                          fill: 'rgba(255, 255, 255, 0.7)',
                          fontSize: 11
                        }
                      },
                      legend: {
                        text: {
                          fill: 'rgba(255, 255, 255, 0.7)',
                          fontSize: 12
                        }
                      }
                    },
                    grid: {
                      line: {
                        stroke: 'rgba(255, 255, 255, 0.15)',
                        strokeWidth: 1
                      }
                    }
                  }}
                  isInteractive={false}
                />
                
                {/* Tracer overlay */}
                {currentProfilePoint && (
                  <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                      <g transform={`translate(${20}, ${20})`}>
                        {/* Calculate position based on scales */}
                        {(() => {
                          // Recreate the scales used by ResponsiveLine
                          const xMax = Math.max(...elevationProfileData[0].data.map(d => d.x));
                          const yMin = Math.floor(Math.min(...elevationProfileData[0].data.map(d => d.y)) / 20) * 20;
                          const yMax = Math.ceil(Math.max(...elevationProfileData[0].data.map(d => d.y)) / 20) * 20;
                          
                          const width = chartRef.current?.clientWidth - 20 - 50 || 430; // chart width - right margin - left margin
                          const height = chartRef.current?.clientHeight - 20 - 70 || 210; // chart height - top margin - bottom margin
                          
                          const xScale = (x) => 50 + (x / xMax) * width; // left margin + scaled x
                          const yScale = (y) => 20 + height - ((y - yMin) / (yMax - yMin)) * height; // top margin + scaled y
                          
                          const x = xScale(currentProfilePoint.x);
                          const y = yScale(currentProfilePoint.y);
                          
                          return (
                            <>
                              {/* Vertical line from bottom to point */}
                              <line
                                x1={x}
                                y1={20 + height}
                                x2={x}
                                y2={y}
                                stroke="rgba(255, 255, 255, 0.5)"
                                strokeWidth={1}
                                strokeDasharray="3,3"
                              />
                              
                              {/* Circle at the current position */}
                              <circle
                                cx={x}
                                cy={y}
                                r={4}
                                stroke="white"
                                strokeWidth={1.5}
                                fill="#ff0000"
                              />
                              
                              {/* Gradient info box */}
                              <g transform={`translate(${x > width * 0.7 ? x - 100 : x + 10}, ${y - 40})`}>
                                <rect
                                  x={0}
                                  y={0}
                                  width={90}
                                  height={50}
                                  rx={4}
                                  fill="rgba(0, 0, 0, 0.8)"
                                  stroke="rgba(255, 255, 255, 0.4)"
                                />
                                <text x={10} y={20} fill="#0288d1" fontSize={11}>Elevation:</text>
                                <text x={70} y={20} fill="white" fontSize={11} textAnchor="end">{Math.round(currentProfilePoint.y)}m</text>
                                <text x={10} y={40} fill="#0288d1" fontSize={11}>Gradient:</text>
                                <text x={70} y={40} fill="white" fontSize={11} textAnchor="end">{currentGradient.toFixed(1)}%</text>
                              </g>
                            </>
                          );
                        })()}
                      </g>
                    </svg>
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              No elevation data available
            </Box>
          )}
        </Box>

      </Box>
    </Modal>
  );
};

export default PresentationClimbViewer;
