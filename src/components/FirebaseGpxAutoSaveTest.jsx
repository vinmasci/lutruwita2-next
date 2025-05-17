import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Button,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { db } from '../services/firebaseService';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import { getFirebaseAutoSaveStatus } from '../services/firebaseGpxAutoSaveService';
import { getFirebaseDescriptionAutoSaveStatus } from '../services/firebaseDescriptionAutoSaveService';

/**
 * Test component for Firebase GPX auto-save functionality
 * This component displays auto-saved GPX data for the current user
 */
const FirebaseGpxAutoSaveTest = ({ userId = 'anonymous-user' }) => {
  // Helper function to format coordinates for display
  const formatCoordinates = (coords) => {
    if (!coords || !Array.isArray(coords)) return 'No coordinates';
    
    // Check if coordinates are in the new object format
    if (coords.length > 0 && typeof coords[0] === 'object' && 'lng' in coords[0] && 'lat' in coords[0]) {
      // Format as "lng, lat" for the first few coordinates
      return coords.slice(0, 3).map(coord => `${coord.lng.toFixed(4)}, ${coord.lat.toFixed(4)}`).join(' | ') + 
        (coords.length > 3 ? ` ... (${coords.length} points total)` : '');
    } 
    
    // Handle old array format (should not happen after our updates)
    if (coords.length > 0 && Array.isArray(coords[0])) {
      return coords.slice(0, 3).map(coord => `${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`).join(' | ') + 
        (coords.length > 3 ? ` ... (${coords.length} points total)` : '');
    }
    
    return 'Invalid coordinate format';
  };
  const [autoSaves, setAutoSaves] = useState([]);
  const [selectedSave, setSelectedSave] = useState(null);
  const [coordsData, setCoordsData] = useState(null);
  const [poisData, setPoisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(getFirebaseAutoSaveStatus());
  const [descriptionAutoSaveStatus, setDescriptionAutoSaveStatus] = useState(getFirebaseDescriptionAutoSaveStatus());
  const [descriptionData, setDescriptionData] = useState(null);

  // Fetch auto-saves for the current user
  const fetchAutoSaves = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if Firebase is initialized
      if (!db) {
        throw new Error('Firebase not initialized');
      }
      
      // Create a query to get auto-saves for the current user
      const q = query(
        collection(db, 'gpx_auto_saves'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      // Execute the query
      const querySnapshot = await getDocs(q);
      
      // Process the results
      const saves = [];
      querySnapshot.forEach((doc) => {
        saves.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        });
      });
      
      setAutoSaves(saves);
      
      // Clear selected save when refreshing
      setSelectedSave(null);
      setCoordsData(null);
      setPoisData(null);
    } catch (err) {
      console.error('Error fetching auto-saves:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data for a selected auto-save
  const fetchAutoSaveData = async (autoSaveId) => {
    if (!autoSaveId) return;
    
    try {
      setLoading(true);
      
      console.log('Fetching data for auto-save:', autoSaveId);
      
      // Get the coordinates document
      const coordsRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'coords');
      console.log('Coordinates document reference:', coordsRef.path);
      
      const coordsSnap = await getDoc(coordsRef);
      console.log('Coordinates document exists:', coordsSnap.exists());
      
      if (coordsSnap.exists()) {
        const data = coordsSnap.data();
        console.log('Coordinates data:', data);
        setCoordsData(data.data || []);
      } else {
        console.log('No coordinates document found');
        setCoordsData([]);
      }
      
      // Get POIs data
      try {
        const poisRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'pois');
        const poisSnap = await getDoc(poisRef);
        console.log('POIs document exists:', poisSnap.exists());
        
        if (poisSnap.exists()) {
          const data = poisSnap.data();
          console.log('POIs data:', data);
          setPoisData(data.data || { draggable: [], places: [] });
        } else {
          console.log('No POIs document found');
          setPoisData({ draggable: [], places: [] });
        }
      } catch (poisErr) {
        console.error('Error fetching POIs data:', poisErr);
        setPoisData({ draggable: [], places: [] });
      }
      
      // Get description data
      try {
        const descriptionRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'description');
        const descriptionSnap = await getDoc(descriptionRef);
        console.log('Description document exists:', descriptionSnap.exists());
        
        if (descriptionSnap.exists()) {
          const data = descriptionSnap.data();
          console.log('Description data:', data);
          setDescriptionData(data.data || { description: '', photos: [] });
        } else {
          console.log('No description document found');
          setDescriptionData({ description: '', photos: [] });
        }
      } catch (descriptionErr) {
        console.error('Error fetching description data:', descriptionErr);
        setDescriptionData({ description: '', photos: [] });
      }
      
      // Also try to get elevation and unpaved data
      try {
        const elevationRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'elevation');
        const elevationSnap = await getDoc(elevationRef);
        console.log('Elevation document exists:', elevationSnap.exists());
        
        const unpavedRef = doc(db, 'gpx_auto_saves', autoSaveId, 'data', 'unpaved');
        const unpavedSnap = await getDoc(unpavedRef);
        console.log('Unpaved document exists:', unpavedSnap.exists());
      } catch (subErr) {
        console.error('Error fetching additional data:', subErr);
      }
    } catch (err) {
      console.error('Error fetching coordinates data:', err);
      setError(`Error fetching coordinates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selecting an auto-save
  const handleSelectSave = (save) => {
    setSelectedSave(save);
    fetchAutoSaveData(save.id);
  };
  
  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getFirebaseAutoSaveStatus());
      setDescriptionAutoSaveStatus(getFirebaseDescriptionAutoSaveStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2, maxWidth: 600 }}>
      <Typography variant="h5" gutterBottom>
        Firebase GPX Auto-Save Test
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1">GPX Auto-Save Status:</Typography>
        <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2">
            Loading: {status.isLoading ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            Last Saved Route: {status.lastSavedRoute || 'None'}
          </Typography>
          <Typography variant="body2">
            Last Save Time: {status.lastSaveTime ? `${status.lastSaveTime}ms` : 'N/A'}
          </Typography>
          <Typography variant="body2">
            Success: {status.success ? 'Yes' : 'No'}
          </Typography>
          {status.error && (
            <Typography variant="body2" color="error">
              Error: {status.error}
            </Typography>
          )}
        </Box>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1">Description Auto-Save Status:</Typography>
        <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2">
            Loading: {descriptionAutoSaveStatus.isLoading ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            Last Saved Description: {descriptionAutoSaveStatus.lastSavedDescription || 'None'}
          </Typography>
          <Typography variant="body2">
            Last Save Time: {descriptionAutoSaveStatus.lastSaveTime ? `${descriptionAutoSaveStatus.lastSaveTime}ms` : 'N/A'}
          </Typography>
          <Typography variant="body2">
            Success: {descriptionAutoSaveStatus.success ? 'Yes' : 'No'}
          </Typography>
          {descriptionAutoSaveStatus.error && (
            <Typography variant="body2" color="error">
              Error: {descriptionAutoSaveStatus.error}
            </Typography>
          )}
        </Box>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={fetchAutoSaves} 
          disabled={loading}
          sx={{ mr: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Refresh Auto-Saves'}
        </Button>
        
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Showing auto-saves for user: {userId}
        </Typography>
      </Box>
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error: {error}
        </Typography>
      )}
      
      <Divider sx={{ mb: 2 }} />
      
      <Typography variant="h6" gutterBottom>
        Auto-Saved GPX Files ({autoSaves.length})
      </Typography>
      
      {autoSaves.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No auto-saved GPX files found. Upload a GPX file to see it here.
        </Typography>
      ) : (
        <>
          <List>
            {autoSaves.map((save) => (
              <React.Fragment key={save.id}>
                <ListItem 
                  alignItems="flex-start" 
                  button 
                  onClick={() => handleSelectSave(save)}
                  selected={selectedSave?.id === save.id}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                    '&.Mui-selected': { bgcolor: 'rgba(25, 118, 210, 0.08)' }
                  }}
                >
                  <ListItemText
                    primary={save.name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          File: {save.gpxFileName}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Status: {save.status}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Created: {save.createdAt.toLocaleString()}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          ID: {save.id}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
          
          {selectedSave && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Selected Auto-Save: {selectedSave.name}
              </Typography>
              
              {loading ? (
                <CircularProgress size={24} sx={{ mt: 1 }} />
              ) : (
                <>
                  {coordsData ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Coordinates Sample ({coordsData.length} points total):
                      </Typography>
                      <Tooltip title="Coordinates are now stored as objects with lng/lat properties instead of nested arrays">
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                          {formatCoordinates(coordsData)}
                        </Typography>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No coordinate data available
                    </Typography>
                  )}
                  
                  {poisData ? (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        POIs Data:
                      </Typography>
                      <Typography variant="body2">
                        Draggable POIs: {poisData.draggable?.length || 0}
                      </Typography>
                      <Typography variant="body2">
                        Place POIs: {poisData.places?.length || 0}
                      </Typography>
                      {poisData.draggable?.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            Sample POI:
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                            {JSON.stringify(poisData.draggable[0], null, 2)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      No POI data available
                    </Typography>
                  )}
                  
                  {descriptionData ? (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Description Data:
                      </Typography>
                      <Typography variant="body2">
                        Description Length: {descriptionData.description?.length || 0} characters
                      </Typography>
                      <Typography variant="body2">
                        Photos: {descriptionData.photos?.length || 0}
                      </Typography>
                      {descriptionData.description && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            Description Preview:
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto', maxHeight: '100px', overflow: 'auto' }}>
                            {descriptionData.description.substring(0, 200)}
                            {descriptionData.description.length > 200 ? '...' : ''}
                          </Typography>
                        </Box>
                      )}
                      {descriptionData.photos?.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            Sample Photo:
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                            {JSON.stringify(descriptionData.photos[0], null, 2)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      No description data available
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

export default FirebaseGpxAutoSaveTest;
