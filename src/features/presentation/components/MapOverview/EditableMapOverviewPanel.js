import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Snackbar, Alert, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useMapOverview } from '../../../presentation/context/MapOverviewContext.jsx';
import { useRouteContext } from '../../../map/context/RouteContext';
import { useLineContext } from '../../../lineMarkers/context/LineContext';
import { RichTextEditor } from '../../../gpx/components/RouteDescription/RichTextEditor';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { getRouteDistance, getUnpavedPercentage, getElevationGain } from '../../../gpx/utils/routeUtils';

const BACKGROUND_COLOR = 'rgba(26, 26, 26, 0.9)';
const EDITOR_BACKGROUND = 'rgb(35, 35, 35)';
const BUTTON_COLOR = '#2196f3'; // Material UI Blue

const OverviewContent = styled('div')({
  width: '100%',
  height: '100%',
  padding: 0,
  backgroundColor: '#1a1a1a'
});

/**
 * Editable Map Overview Panel component for creation mode
 * Allows editing the global map overview content that applies to the entire file
 * Uses the same rich text editor as the route description panel
 */
export const EditableMapOverviewPanel = () => {
  const { mapOverview, updateDescription } = useMapOverview();
  const { routes, currentRoute, headerSettings, currentLoadedState, saveCurrentState } = useRouteContext();
  
  // Get the line context to pass line data to saveCurrentState
  let lineContext;
  try {
    lineContext = useLineContext();
  } catch (error) {
    console.log('[EditableMapOverviewPanel] LineContext not available:', error.message);
    lineContext = null;
  }
  const [editorContent, setEditorContent] = useState(mapOverview?.description || '');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editorRef, setEditorRef] = useState(null);

  // Update editor content when mapOverview changes (e.g., when loading a saved file)
  useEffect(() => {
    setEditorContent(mapOverview?.description || '');
  }, [mapOverview?.description]);

  // Automatically insert metadata when the editor is ready and content is empty
  useEffect(() => {
    if (editorRef && (!editorContent || editorContent === '<p></p>')) {
      const metadataHtml = generateMetadataHtml();
      editorRef.commands.setContent(metadataHtml);
      updateDescription(metadataHtml);
    }
  }, [editorRef, editorContent]);

  // Handle editor content changes
  const handleEditorChange = (content) => {
    setEditorContent(content);
    // Auto-save after a short delay
    const timeoutId = setTimeout(() => {
      updateDescription(content);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  // Handle manual save
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Update the local state first
      updateDescription(editorContent);
      
      // Get the current route name, type, and public status from the loaded state
      const name = currentLoadedState?.name || 'Untitled Route';
      const type = currentLoadedState?.type || 'bikepacking';
      const isPublic = currentLoadedState?.isPublic || false;
      
      // Get line data from the line context if available
      const lineData = lineContext?.getLines ? lineContext.getLines() : [];
      
      // Trigger the actual save operation with only the changed sections
      await saveCurrentState(name, type, isPublic, lineData);
      
      setShowSaveSuccess(true);
    } catch (error) {
      console.error('[EditableMapOverviewPanel] Error saving map overview:', error);
      setSaveError(error.message || 'Failed to save map overview');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setShowSaveSuccess(false);
    setSaveError(null);
  };

  // Calculate route summary data
  const routeSummary = useMemo(() => {
    if (!routes || routes.length === 0) return null;

    // Initialize summary data
    let totalDistance = 0;
    let totalAscent = 0;
    let totalUnpavedDistance = 0;
    let totalRouteDistance = 0;
    let isLoop = true;
    const countries = new Set(['Australia']); // Default country
    const states = new Set();
    const lgas = new Set();

    // Variables to store first and last points for overall loop check
    let firstRouteStart = null;
    let lastRouteEnd = null;

    // Calculate totals from all routes
    routes.forEach((route, index) => {
      // Distance
      const distance = getRouteDistance(route);
      totalDistance += distance;
      totalRouteDistance += distance;

      // Elevation
      const ascent = getElevationGain(route);
      totalAscent += ascent;

      // Unpaved sections
      const unpavedPercentage = getUnpavedPercentage(route);
      totalUnpavedDistance += (distance * unpavedPercentage / 100);

      // Get coordinates for loop check
      if (route.geojson?.features?.[0]?.geometry?.coordinates) {
        const coordinates = route.geojson.features[0].geometry.coordinates;
        if (coordinates.length > 1) {
          // Store first route's start point
          if (index === 0) {
            firstRouteStart = coordinates[0];
          }
          
          // Store last route's end point
          if (index === routes.length - 1) {
            lastRouteEnd = coordinates[coordinates.length - 1];
          }
        }
      }

      // Location data
      if (route.metadata) {
        if (route.metadata.country) countries.add(route.metadata.country);
        if (route.metadata.state) states.add(route.metadata.state);
        if (route.metadata.lga) lgas.add(route.metadata.lga);
      }
    });

    // Calculate unpaved percentage
    const unpavedPercentage = totalRouteDistance > 0 
      ? Math.round((totalUnpavedDistance / totalRouteDistance) * 100) 
      : 0;

    return {
      totalDistance: Math.round(totalDistance / 1000 * 10) / 10, // Convert to km with 1 decimal
      totalAscent: Math.round(totalAscent),
      unpavedPercentage,
      isLoop,
      countries: Array.from(countries),
      states: Array.from(states),
      lgas: Array.from(lgas)
    };
  }, [routes]);

  // Generate metadata HTML based on the route summary
  const generateMetadataHtml = () => {
    if (!routeSummary) {
      return '<p>No route data available</p>';
    }

    // Get the map title from the currentLoadedState (file title)
    const mapTitle = currentLoadedState?.name || 'Map Overview';

    // Extract metadata
    const state = routeSummary.states.length > 0 ? routeSummary.states.join(', ') : 'Unknown';
    const distance = `${routeSummary.totalDistance} km`;
    const elevation = `${routeSummary.totalAscent.toLocaleString()} m`;
    const unpavedPercentage = `${routeSummary.unpavedPercentage}%`;
    
    // Get the first LGA if available (ensuring we only get the first one even if it contains commas)
    let lga = null;
    if (routeSummary.lgas && routeSummary.lgas.length > 0) {
      // Get the first LGA and split by commas if needed
      const firstLga = routeSummary.lgas[0];
      // If the LGA contains commas, take only the part before the first comma
      if (firstLga.includes(',')) {
        lga = firstLga.split(',')[0].trim();
      } else {
        lga = firstLga;
      }
    }
    
    // Blue color for labels and heading (same as the editor's blue)
    const blueColor = '#2196f3';
    
    // Circle divider with spaces
    const divider = ' <span style="color: #666;">•</span> ';
    
    // Create HTML with blue labels and circle dividers
    return `
      <h1 style="color: ${blueColor};">${mapTitle}</h1>
      <p style="margin-bottom: 8px;">
        <strong style="color: ${blueColor};">State:</strong> ${state}
        ${lga ? `${divider}<strong style="color: ${blueColor};">LGA:</strong> ${lga}` : ''}
      </p>
      <p style="margin-bottom: 16px;">
        <strong style="color: ${blueColor};">Distance:</strong> ${distance}
        ${divider}
        <strong style="color: ${blueColor};">Elevation Gain:</strong> ${elevation}
        ${divider}
        <strong style="color: ${blueColor};">Unpaved:</strong> ${unpavedPercentage}
        ${routeSummary.isLoop ? `${divider}<strong style="color: ${blueColor};">Type:</strong> Loop` : ''}
      </p>
    `;
  };

  // Insert metadata into the editor
  const insertMetadata = () => {
    if (editorRef) {
      const metadataHtml = generateMetadataHtml();
      // Insert at the beginning of the editor
      const currentContent = editorRef.getHTML();
      editorRef.commands.setContent(metadataHtml + currentContent);
    }
  };

  return _jsxs("div", {
    className: "map-overview-editor",
    children: [
      _jsxs(OverviewContent, {
        children: [
          _jsxs(Box, {
            sx: { 
              px: 2, 
              py: 1, 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: '#1a1a1a',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)' 
            },
            children: [
              _jsx(Typography, 
                {
                  variant: "subtitle2", 
                  color: "white", 
                  sx: { 
                    fontSize: '0.8rem', 
                    fontWeight: 500, 
                    mr: 3, 
                    fontFamily: 'Futura' 
                  },
                  children: "Edit Map Overview"
                }
              )
            ]
          }),
          _jsxs(Box, {
            sx: {
              height: 'calc(100% - 40px)', // Subtract header height
              display: 'flex',
              flexDirection: 'column',
              p: 2,
              gap: 2
            },
            children: [
              _jsxs(Box, {
                sx: {
                  backgroundColor: '#1e1e1e',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                },
                children: [
                  _jsx("i", {
                    className: "fa-solid fa-circle-info",
                    style: {
                      color: '#2196f3',
                      fontSize: '1.2rem'
                    }
                  }),
                  _jsx("div", {
                    style: {
                      color: '#a8c7fa',
                      fontSize: '0.85rem',
                      fontFamily: 'Futura, sans-serif'
                    },
                    children: "Use this editor to create a global overview for your map. This content applies to the entire file, not just individual routes."
                  })
                ]
              }),
              _jsx(Box, {
                sx: {
                  flex: 1,
                  backgroundColor: EDITOR_BACKGROUND,
                  borderRadius: '4px',
                  overflow: 'hidden'
                },
                children: _jsx(RichTextEditor, {
                  value: editorContent,
                  onChange: handleEditorChange,
                  onEditorReady: (editor) => setEditorRef(editor)
                })
              }),
              _jsx(Box, {
                sx: {
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  width: '100%'
                },
                children: 
                  _jsx(Button, {
                    variant: "outlined",
                    onClick: handleSave,
                    disabled: isSaving,
                    sx: {
                      borderColor: BUTTON_COLOR,
                      color: BUTTON_COLOR,
                      borderWidth: 2,
                      fontFamily: 'Futura, sans-serif',
                      '&:hover': {
                        borderColor: BUTTON_COLOR,
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2
                      }
                    },
                    children: isSaving ? "Saving..." : "Save Overview"
                  })
              })
            ]
          })
        ]
      }),
      _jsx(Snackbar, {
        open: showSaveSuccess,
        autoHideDuration: 3000,
        onClose: handleCloseSnackbar,
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        children: _jsx(Alert, {
          onClose: handleCloseSnackbar,
          severity: "info",
          sx: {
            width: '100%',
            fontFamily: 'Futura, sans-serif'
          },
          children: "Map overview saved successfully"
        })
      }),
      _jsx(Snackbar, {
        open: !!saveError,
        autoHideDuration: 5000,
        onClose: handleCloseSnackbar,
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        children: _jsx(Alert, {
          onClose: handleCloseSnackbar,
          severity: "error",
          sx: {
            width: '100%',
            fontFamily: 'Futura, sans-serif'
          },
          children: saveError || "An error occurred while saving"
        })
      })
    ]
  });
};
