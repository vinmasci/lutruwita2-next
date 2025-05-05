import { createApiHandler } from '../lib/middleware.js';
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/db.js';
import { deleteFile, uploadJsonData } from '../lib/cloudinary.js';
import { getCache, setCache, deleteCache } from '../lib/redis.js';
import { decompressData, isCompressedData } from '../lib/compression.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase integration is optional
// We'll check if firebase-admin is installed before trying to use it
let admin;
let db;
let firebaseAvailable = false;

// Initialize Firebase Admin SDK
const initializeFirebase = async () => {
  try {
    // Try to import firebase-admin using dynamic import
    const firebaseAdmin = await import('firebase-admin');
    
    // With dynamic imports, we need to access the default export
    admin = firebaseAdmin.default;
    console.log('[API] Firebase Admin SDK imported successfully');
    
    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps?.length) {
      try {
        console.log('[API] Initializing Firebase Admin SDK...');
        
        // Load service account key file
        try {
          const path = await import('path');
          const fs = await import('fs');
          const { fileURLToPath } = await import('url');
          
          // Get the directory name
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          
          // Path to service account key file
          const serviceAccountPath = path.resolve(__dirname, '../../api/config/serviceAccountKey.json');
          console.log(`[API] Looking for service account key at: ${serviceAccountPath}`);
          
          // Check if the file exists
          if (fs.existsSync(serviceAccountPath)) {
            console.log('[API] Service account key file found');
            
            // Read and parse the service account key file
            const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            
            // Initialize Firebase with the service account key
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccountKey)
            });
            
            console.log('[API] Firebase initialized with service account key');
          } else {
            console.log('[API] Service account key file not found, falling back to environment variables');
            
            // Get Firebase configuration from environment variables with fallbacks
            const projectId = process.env.FIREBASE_PROJECT_ID || 'cyatrails';
            const projectNumber = process.env.FIREBASE_PROJECT_NUMBER || '79924943942';
            const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyDMPCfqbTIiT3vFE1QZRZXkUuX1Nc85XxI';
            
            console.log(`[API] Using Firebase project ID: ${projectId}`);
            console.log(`[API] Using Firebase project number: ${projectNumber || 'Not provided'}`);
            console.log(`[API] Firebase API key configured: ${apiKey ? 'Yes' : 'No'}`);
            
            // Initialize with explicit project ID
            admin.initializeApp({
              projectId: projectId
            });
          }
        } catch (error) {
          console.error('[API] Error loading service account key:', error);
          
          // Fallback to environment variables
          const projectId = process.env.FIREBASE_PROJECT_ID || 'cyatrails';
          console.log(`[API] Falling back to environment variables with project ID: ${projectId}`);
          
          // Initialize with explicit project ID
          admin.initializeApp({
            projectId: projectId
          });
        }
        
        console.log('[API] Firebase Admin SDK initialized successfully');
        
        // Get Firestore instance
        db = admin.firestore();
        console.log('[API] Firestore instance created');
        
        // Test Firestore connection
        try {
          await db.collection('test').doc('test').set({ test: true });
          console.log('[API] Firestore connection test successful');
          firebaseAvailable = true;
        } catch (firestoreError) {
          console.error('[API] Firestore connection test failed:', firestoreError);
          console.error('[API] Error details:', firestoreError.message);
          firebaseAvailable = false;
        }
      } catch (initError) {
        console.error('[API] Error initializing Firebase Admin SDK:', initError);
        console.error('[API] Error details:', initError.message);
        if (initError.code) {
          console.error('[API] Error code:', initError.code);
        }
      }
    } else {
      // Firebase is already initialized
      console.log('[API] Firebase Admin SDK already initialized');
      db = admin.firestore();
      firebaseAvailable = true;
    }
  } catch (importError) {
    console.log('[API] Firebase Admin SDK not available, skipping Firebase integration');
    console.log('[API] Error details:', importError.message);
  }
  
  // Log Firebase availability
  console.log('[API] Firebase available:', firebaseAvailable);
  return firebaseAvailable;
};

// Initialize Firebase
await initializeFirebase();

/**
 * Helper function to convert MongoDB ObjectId to string
 * This version uses a non-recursive approach to avoid stack overflow
 * @param {*} data - The data to process
 * @returns {*} - The processed data with ObjectId converted to string
 */
const convertObjectIdToString = (data) => {
  // Simple case: null or undefined
  if (data === null || data === undefined) {
    return data;
  }
  
  // Simple case: primitive values
  if (typeof data !== 'object') {
    return data;
  }
  
  // Handle ObjectId directly
  if (data && typeof data === 'object' && data._bsontype === 'ObjectID' && typeof data.toString === 'function') {
    return data.toString();
  }
  
  // Use JSON.stringify and JSON.parse to create a deep copy and break circular references
  try {
    // Custom replacer function for JSON.stringify
    const replacer = (key, value) => {
      // Handle ObjectId
      if (value && typeof value === 'object' && value._bsontype === 'ObjectID' && typeof value.toString === 'function') {
        return value.toString();
      }
      
      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Handle other special types if needed
      
      return value;
    };
    
    // Use JSON.stringify with replacer to convert ObjectId to string
    const jsonString = JSON.stringify(data, replacer);
    
    // Parse back to object
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[API] Error converting ObjectId to string:', error);
    
    // Fallback to a simpler approach if JSON.stringify fails
    // This might happen if there are circular references
    
    // For arrays, create a new array with converted values
    if (Array.isArray(data)) {
      return data.map(item => {
        if (item && typeof item === 'object' && item._bsontype === 'ObjectID' && typeof item.toString === 'function') {
          return item.toString();
        }
        return item;
      });
    }
    
    // For objects, create a new object with converted values
    if (typeof data === 'object') {
      const result = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          if (value && typeof value === 'object' && value._bsontype === 'ObjectID' && typeof value.toString === 'function') {
            result[key] = value.toString();
          } else {
            result[key] = value;
          }
        }
      }
      return result;
    }
    
    // If all else fails, return the original data
    return data;
  }
};

/**
 * Check if a value is valid for Firestore
 * @param {*} value - The value to check
 * @param {string} path - The current path in the object (for logging)
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidForFirestore = (value, path = '') => {
  // Check for null or undefined (valid)
  if (value === null || value === undefined) {
    return true;
  }
  
  // Check for primitive types (valid)
  if (typeof value !== 'object') {
    return true;
  }
  
  // Check for arrays (valid if all elements are valid)
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!isValidForFirestore(value[i], `${path}[${i}]`)) {
        return false;
      }
    }
    return true;
  }
  
  // Check for Date objects (valid)
  if (value instanceof Date) {
    return true;
  }
  
  // Check for Firestore FieldValue (valid)
  if (admin.firestore && value instanceof admin.firestore.FieldValue) {
    return true;
  }
  
  // Check for custom objects with prototypes
  if (value.constructor && value.constructor.name !== 'Object') {
    console.log(`[API] Invalid value at ${path}: ${value.constructor.name} is not a valid Firestore type`);
    return false;
  }
  
  // Check all properties of the object
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      if (!isValidForFirestore(value[key], `${path}.${key}`)) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Save optimized route data to Firebase
 * @param {string} routeId - The persistent ID of the route
 * @param {Object} optimizedData - The optimized route data to save
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
const saveOptimizedRouteDataToFirebase = async (routeId, optimizedData) => {
  // Skip if Firebase is not available
  if (!firebaseAvailable) {
    console.log('[API] Firebase not available, skipping Firebase save');
    return false;
  }
  
  try {
    console.log(`[API] Saving optimized data to Firebase for route: ${routeId}`);
    console.log(`[API] Data size: ${JSON.stringify(optimizedData).length} bytes`);
    
    // Log collection and document info
    console.log(`[API] Firestore collection: optimizedRoutes, document ID: ${routeId}`);
    
    // Convert any MongoDB ObjectId to string
    const processedData = convertObjectIdToString(optimizedData);
    console.log('[API] Processed data for Firebase compatibility');
    
    // Always use the stringified version to avoid Firestore limitations
    console.log('[API] Saving data as a stringified JSON to avoid Firestore limitations');
    
    // Create the document data with stringified JSON
    const docData = {
      dataString: JSON.stringify(processedData),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      version: 1 // Initial version
    };
    
    // Save to Firestore
    await db.collection('optimizedRoutes').doc(routeId).set(docData);
    
    console.log(`[API] Successfully saved optimized data to Firebase for route: ${routeId}`);
    
    // Verify the data was saved
    const docRef = db.collection('optimizedRoutes').doc(routeId);
    const docSnapshot = await docRef.get();
    
    if (docSnapshot.exists) {
      console.log(`[API] Verified data was saved to Firebase for route: ${routeId}`);
      return true;
    } else {
      console.error(`[API] Data was not saved to Firebase for route: ${routeId}`);
      return false;
    }
  } catch (error) {
    console.error(`[API] Error saving optimized data to Firebase:`, error);
    console.error(`[API] Error details:`, error.message);
    if (error.code) {
      console.error(`[API] Error code:`, error.code);
    }
    return false;
  }
};

// Define Route schema to match the original structure
const RouteSchema = new mongoose.Schema({
  // Top-level fields
  persistentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['tourism', 'event', 'bikepacking', 'single'], required: true },
  isPublic: { type: Boolean, default: false },
  userId: { type: String, required: true, index: true },
  viewCount: { type: Number, default: 0 },
  lastViewed: { type: Date },
  eventDate: { type: Date }, // Date field for event type routes
  publicId: { type: String, index: true, sparse: true },
  embedUrl: { type: String }, // URL to the pre-processed embed data in Cloudinary
  staticMapUrl: { type: String }, // URL to the pre-generated static map image in Cloudinary
  staticMapPublicId: { type: String }, // Public ID of the static map image in Cloudinary
  
  // Header settings
  headerSettings: {
    color: { type: String },
    logoUrl: { type: String },
    username: { type: String }
  },
  
  // Map overview
  mapOverview: {
    description: { type: String, default: '' }
  },
  
  // Map state
  mapState: {
    zoom: { type: Number, default: 0 },
    center: { type: [Number], default: [0, 0] },
    bearing: { type: Number, default: 0 },
    pitch: { type: Number, default: 0 },
    style: { type: String, default: 'default' }
  },
  
  // Routes array
  routes: [{
    order: { type: Number }, // Made optional by removing required: true
    routeId: { type: String },
    name: { type: String, required: true },
    color: { type: String, required: true, default: '#ee5253' },
    isVisible: { type: Boolean, required: true, default: true },
    geojson: { type: mongoose.Schema.Types.Mixed },
    description: {
      title: { type: String },
      description: { type: String }
    },
    surface: {
      surfaceTypes: [{ 
        type: { type: String },
        percentage: { type: Number },
        distance: { type: Number }
      }],
      elevationProfile: [{ 
        elevation: { type: Number },
        distance: { type: Number },
        grade: { type: Number }
      }]
    },
    unpavedSections: [{
      startIndex: { type: Number },
      endIndex: { type: Number },
      coordinates: { type: [[Number]] },
      surfaceType: { type: String }
    }],
    statistics: { type: mongoose.Schema.Types.Mixed },
    status: { type: mongoose.Schema.Types.Mixed }
  }],
  
  // Photos array
  photos: [{
    name: { type: String },
    url: { type: String },
    thumbnailUrl: { type: String },
    dateAdded: { type: String },
    caption: { type: String }, // Add caption field to photos in routes
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    rotation: { type: Number },
    altitude: { type: Number }
  }],
  
  // POIs object
  pois: {
    draggable: [{
      id: { type: String, required: true },
      coordinates: { type: [Number], required: true },
      name: { type: String, required: true },
      description: { type: String },
      category: { type: String, required: true },
      icon: { type: String, required: true },
      photos: [{ type: mongoose.Schema.Types.Mixed }],
      type: { type: String, enum: ['draggable'], required: true },
      googlePlaceId: { type: String },
      googlePlaceUrl: { type: String },
      googlePlaces: {
        placeId: { type: String },
        url: { type: String }
      }
    }],
    places: [{
      id: { type: String, required: true },
      coordinates: { type: [Number], required: true },
      name: { type: String, required: true },
      category: { type: String, required: true },
      icon: { type: String, required: true },
      photos: [{ type: mongoose.Schema.Types.Mixed }],
      type: { type: String, enum: ['place'], required: true },
      placeId: { type: String, required: true }
    }]
  },
  
  // Lines array
  lines: [{
    id: { type: String, required: true },
    type: { type: String, default: 'line' },
    coordinates: {
      start: { type: [Number], required: true },
      end: { type: [Number], required: true },
      mid: { type: [Number] } // Add mid property for 45-degree diagonal lines
    },
    name: { type: String },
    description: { type: String },
    icons: [{ type: String }],
    photos: [{ type: mongoose.Schema.Types.Mixed }]
  }],
  
  // Data object
  data: {
    points: { type: [mongoose.Schema.Types.Mixed], default: [] },
    surfaces: { type: [mongoose.Schema.Types.Mixed], default: [] },
    geojson: mongoose.Schema.Types.Mixed,
    distance: Number,
    elevation: {
      gain: Number,
      loss: Number,
      min: Number,
      max: Number
    },
    bounds: {
      north: Number,
      south: Number,
      east: Number,
      west: Number
    }
  },
  
  // Metadata object
  metadata: {
    tags: { type: [String], default: [] },
    difficulty: String,
    season: String,
    country: { type: String, default: 'Australia' },
    state: { type: String },
    lga: { type: String },
    isLoop: { type: Boolean },
    unpavedPercentage: { type: Number, default: 0 },
    totalDistance: { type: Number },
    totalAscent: { type: Number },
    custom: mongoose.Schema.Types.Mixed
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  __v: { type: Number, default: 0 }
});

// Initialize the model
let Route;
try {
  // Try to get the model if it exists
  Route = mongoose.model('Route');
} catch (e) {
  // Create the model if it doesn't exist
  Route = mongoose.model('Route', RouteSchema);
}

// Handler for creating a route
async function handleCreateRoute(req, res) {
  try {
    // Check if required fields are provided
    if (!req.body || !req.body.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { name, description, isPublic, data, metadata, type, routes, pois, mapState, photos } = req.body;
    
    // Generate a public ID if the route is public
    const publicId = isPublic ? `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Generate a persistent ID if not provided
    const persistentId = req.body.persistentId || `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    console.log(`[API] Creating new route with persistentId: ${persistentId}`);
    
    // Create a new route with the original schema structure
    const route = new Route({
      // Required top-level fields
      persistentId,
      name,
      type: type || 'bikepacking', // Default to bikepacking if not provided
      isPublic: !!isPublic,
      userId: req.body.userId || 'anonymous', // In a real app, get from auth
      viewCount: 0,
      publicId,
      
      // Optional fields with defaults
      description,
      lastViewed: new Date(),
      
      // Static map URL and public ID
      staticMapUrl: req.body.staticMapUrl,
      staticMapPublicId: req.body.staticMapPublicId,
      
      // Header settings
      headerSettings: req.body.headerSettings || {
        color: '#000000',
        logoUrl: null,
        username: ''
      },
      
      // Map overview
      mapOverview: req.body.mapOverview || {
        description: ''
      },
      
      // Complex structures
      mapState: mapState || {
        zoom: 0,
        center: [0, 0],
        bearing: 0,
        pitch: 0,
        style: 'default'
      },
      
      routes: routes || [],
      photos: photos || [],
      
      pois: pois || {
        draggable: [],
        places: []
      },
      
      // Include lines if provided
      lines: req.body.lines || [],
      
      data: data || {
        points: [],
        surfaces: []
      },
      
      metadata: metadata || {
        tags: []
      },
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });
    
    console.log(`[API] Route object created, saving to database...`);
    
    // Save to database
    await route.save();
    
    console.log(`[API] Route saved successfully with ID: ${route._id}`);
    
    // Generate and upload embed data to Cloudinary
    try {
      console.log(`[API] Generating embed data for route: ${route.name}`);
      
      // Create the embed data package
        const embedData = {
          id: route._id,
          persistentId: route.persistentId,
          name: route.name,
          type: route.type, // Include the route type
          eventDate: route.eventDate, // Include the event date
          routes: route.routes.map(r => ({
            routeId: r.routeId,
            name: r.name,
            color: r.color,
            geojson: r.geojson,
            surface: r.surface,
            unpavedSections: r.unpavedSections,
            description: r.description // Include the description field
          })),
          mapState: route.mapState,
          pois: route.pois || { draggable: [], places: [] },
          lines: route.lines || [], // Include the lines array
          photos: route.photos || [],
          elevation: route.routes.map(r => r.surface?.elevationProfile || []),
          description: route.description, // Include the top-level description field
          headerSettings: route.headerSettings, // Include the header settings
          mapOverview: route.mapOverview || { description: '' }, // Include the map overview
          staticMapUrl: route.staticMapUrl, // Include the static map URL
          staticMapPublicId: route.staticMapPublicId, // Include the static map public ID
          _type: 'loaded',
          _loadedState: {
            name: route.name,
            type: route.type, // Include the route type in _loadedState
            eventDate: route.eventDate, // Include the event date in _loadedState
            pois: route.pois || { draggable: [], places: [] },
            lines: route.lines || [], // Include lines in _loadedState too
            photos: route.photos || [],
            headerSettings: route.headerSettings, // Include header settings in _loadedState too
            mapOverview: route.mapOverview || { description: '' }, // Include map overview in _loadedState too
            staticMapUrl: route.staticMapUrl, // Include the static map URL in _loadedState
            staticMapPublicId: route.staticMapPublicId // Include the static map public ID in _loadedState
          }
      };
      
      // Upload to Cloudinary
      const publicId = `embed-${route.persistentId}`;
      console.log(`[API] Uploading embed data to Cloudinary with public ID: ${publicId}`);
      
      const result = await uploadJsonData(embedData, publicId);
      
      // Update the route with the embed URL
      route.embedUrl = result.url;
      await route.save();
      
      console.log(`[API] Embed data uploaded successfully: ${result.url}`);
      
      // Try to save to Firebase if available
      if (firebaseAvailable) {
        try {
          console.log(`[API] Attempting to save optimized data to Firebase for route: ${route.persistentId}`);
          const firebaseSaveResult = await saveOptimizedRouteDataToFirebase(route.persistentId, embedData);
          console.log(`[API] Firebase save result: ${firebaseSaveResult ? 'Success' : 'Failed'}`);
        } catch (firebaseError) {
          console.error(`[API] Error saving to Firebase, but continuing:`, firebaseError);
          console.error(`[API] Error details:`, firebaseError.message);
          if (firebaseError.code) {
            console.error(`[API] Error code:`, firebaseError.code);
          }
          // Continue even if Firebase save fails
        }
      } else {
        console.log(`[API] Firebase not available, skipping Firebase save for route: ${route.persistentId}`);
      }
    } catch (embedError) {
      console.error(`[API] Error generating embed data:`, embedError);
      // Continue even if embed data generation fails
    }
    
    return res.status(201).json(route);
  } catch (error) {
    console.error('Create route error:', error);
    return res.status(500).json({ 
      error: 'Failed to create route',
      details: error.message
    });
  }
}

// Handler for updating a route
async function handleUpdateRoute(req, res) {
  try {
    const { id, findBy } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    let route = null;
    
    // Try to find by persistentId first (prioritize this method)
    // Unless findBy is explicitly set to 'objectId'
    if (findBy !== 'objectId') {
      console.log(`[API] Trying to find route by persistentId for update: ${id}`);
      route = await Route.findOne({ persistentId: id });
      
      if (route) {
        console.log(`[API] Found route by persistentId for update: ${route.name}`);
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find by MongoDB _id (only if findBy isn't explicitly set to 'persistentId')
    if (!route && findBy !== 'persistentId' && mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[API] Trying to find route by MongoDB _id for update: ${id}`);
      route = await Route.findById(id);
      
      if (route) {
        console.log(`[API] Found route by MongoDB _id for update: ${route._id}`);
      }
    }
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    console.log(`[API] Updating route: ${route.name} with ID: ${route.persistentId}`);
    
    // Update all fields that are provided in the request
    const { 
      name, description, isPublic, type, data, metadata, 
      mapState, routes: routeSegments, pois, photos, viewCount, lastViewed,
      headerSettings, eventDate, staticMapUrl, staticMapPublicId // Add staticMapUrl and staticMapPublicId
    } = req.body;
    
    // Update basic fields
    if (name) route.name = name;
    if (description !== undefined) {
      route.description = description;
      
      // If description is provided separately, also update it in the first route
      if (route.routes && route.routes.length > 0 && !routeSegments) {
        console.log(`[API] Updating description in first route`);
        route.routes[0].description = description;
      }
    }
    if (type) route.type = type;
    // Add eventDate update logic
    if (eventDate !== undefined) { // Check if eventDate exists in the payload
        // If type is 'event', set the date, otherwise set to null
        route.eventDate = (type === 'event' || route.type === 'event') ? eventDate : null; 
    } else if (type && type !== 'event' && route.type === 'event') {
        // Handle case where type changes away from 'event' but eventDate wasn't in payload
        route.eventDate = null;
    }
    if (viewCount !== undefined) route.viewCount = viewCount;
    
    // Update isPublic and generate publicId if needed
    if (isPublic !== undefined) {
      route.isPublic = isPublic;
      
      // Generate a public ID if the route is being made public
      if (isPublic && !route.publicId) {
        route.publicId = `route_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    }
    
    // Update header settings if provided
    if (headerSettings) {
      route.headerSettings = {
        ...route.headerSettings || {},
        ...headerSettings
      };
      console.log(`[API] Updated header settings:`, route.headerSettings);
    }
    
    // Update map overview if provided
    if (req.body.mapOverview) {
      route.mapOverview = {
        ...route.mapOverview || {},
        ...req.body.mapOverview
      };
      console.log(`[API] Updated map overview:`, route.mapOverview);
    }
    
    // Update complex structures
    if (mapState) {
      route.mapState = {
        ...route.mapState,
        ...mapState
      };
    }
    
    if (routeSegments) {
      // If routes is an array, replace the entire array
      if (Array.isArray(routeSegments)) {
        route.routes = routeSegments;
      } else {
        // If it's an object with specific updates, apply them
        console.log(`[API] Received route segments update: ${JSON.stringify(routeSegments)}`);
      }
    }
    
    if (pois) {
      // Handle POIs object with draggable and places arrays
      if (pois.draggable) route.pois.draggable = pois.draggable;
      if (pois.places) route.pois.places = pois.places;
    }
    
    // Update lines if provided
    if (req.body.lines) {
      route.lines = req.body.lines;
      console.log(`[API] Updated lines array with ${req.body.lines.length} lines`);
    }
    
    if (photos) {
      route.photos = photos;
    }
    
    // Update static map URL and public ID if provided
    if (staticMapUrl !== undefined) {
      route.staticMapUrl = staticMapUrl;
      console.log(`[API] Updated static map URL: ${staticMapUrl}`);
    }
    
    if (staticMapPublicId !== undefined) {
      route.staticMapPublicId = staticMapPublicId;
      console.log(`[API] Updated static map public ID: ${staticMapPublicId}`);
    }
    
    // Update data and metadata
    if (data) {
      route.data = {
        ...route.data,
        ...data
      };
    }
    
    if (metadata) {
      route.metadata = {
        ...route.metadata,
        ...metadata
      };
    }
    
    // Update timestamps
    route.updatedAt = new Date();
    if (lastViewed) {
      route.lastViewed = lastViewed;
    } else {
      route.lastViewed = new Date();
    }

    console.log(`[API] Saving updated route to database...`);

    // Save to database
    await route.save();
    
    console.log(`[API] Route updated successfully`);
    
    // Generate and upload embed data to Cloudinary
    try {
      console.log(`[API] Generating updated embed data for route: ${route.name}`);
      
      // Create the embed data package
      const embedData = {
        id: route._id,
        persistentId: route.persistentId,
        name: route.name,
        type: route.type, // Include the route type
        eventDate: route.eventDate, // Include the event date
        routes: route.routes.map(r => ({
          routeId: r.routeId,
          name: r.name,
          color: r.color,
          geojson: r.geojson,
          surface: r.surface,
          unpavedSections: r.unpavedSections,
          description: r.description // Include the description field
        })),
        mapState: route.mapState,
        pois: route.pois || { draggable: [], places: [] },
        lines: route.lines || [], // Include the lines array
        photos: route.photos || [],
        elevation: route.routes.map(r => r.surface?.elevationProfile || []),
        description: route.description, // Include the top-level description field
        headerSettings: route.headerSettings, // Include the header settings
        mapOverview: route.mapOverview || { description: '' }, // Include the map overview
        staticMapUrl: route.staticMapUrl, // Include the static map URL
        staticMapPublicId: route.staticMapPublicId, // Include the static map public ID
        _type: 'loaded',
        _loadedState: {
          name: route.name,
          type: route.type, // Include the route type in _loadedState
          eventDate: route.eventDate, // Include the event date in _loadedState
          pois: route.pois || { draggable: [], places: [] },
          lines: route.lines || [], // Include lines in _loadedState too
          photos: route.photos || [],
          headerSettings: route.headerSettings, // Include header settings in _loadedState too
          mapOverview: route.mapOverview || { description: '' }, // Include map overview in _loadedState too
          staticMapUrl: route.staticMapUrl, // Include the static map URL in _loadedState
          staticMapPublicId: route.staticMapPublicId // Include the static map public ID in _loadedState
        }
      };
      
      // Upload to Cloudinary with the same public ID to replace the existing file
      const publicId = `embed-${route.persistentId}`;
      console.log(`[API] Uploading updated embed data to Cloudinary with public ID: ${publicId}`);
      
      // Add a timestamp to force a version update
      const options = {
        timestamp: Date.now()
      };
      
      const result = await uploadJsonData(embedData, publicId, options);
      
      // Update the route with the embed URL if it changed
      if (route.embedUrl !== result.url) {
        route.embedUrl = result.url;
        await route.save();
      }
      
      console.log(`[API] Updated embed data uploaded successfully: ${result.url}`);
      
      // Try to save to Firebase if available
      if (firebaseAvailable) {
        try {
          console.log(`[API] Attempting to save optimized data to Firebase for route: ${route.persistentId}`);
          const firebaseSaveResult = await saveOptimizedRouteDataToFirebase(route.persistentId, embedData);
          console.log(`[API] Firebase save result: ${firebaseSaveResult ? 'Success' : 'Failed'}`);
        } catch (firebaseError) {
          console.error(`[API] Error saving to Firebase, but continuing:`, firebaseError);
          console.error(`[API] Error details:`, firebaseError.message);
          if (firebaseError.code) {
            console.error(`[API] Error code:`, firebaseError.code);
          }
          // Continue even if Firebase save fails
        }
      } else {
        console.log(`[API] Firebase not available, skipping Firebase save for route: ${route.persistentId}`);
      }
    } catch (embedError) {
      console.error(`[API] Error generating updated embed data:`, embedError);
      // Continue even if embed data generation fails
    }
    
    return res.status(200).json(route);
  } catch (error) {
    console.error('Update route error:', error);
    return res.status(500).json({ 
      error: 'Failed to update route',
      details: error.message
    });
  }
}

/**
 * Extract Cloudinary public ID from a URL
 * @param {string} url The Cloudinary URL
 * @returns {string|undefined} The extracted public ID or undefined if not found
 */
function extractPublicIdFromUrl(url) {
  try {
    // Cloudinary URLs are typically in the format:
    // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // The public ID is everything after /upload/vXXXXXXXXXX/
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
      // Skip the version part (vXXXXXXXXXX)
      return pathParts.slice(uploadIndex + 2).join('/');
    }
    return undefined;
  } catch (error) {
    console.error('[API] Error extracting public ID from URL:', error);
    return undefined;
  }
}

// Handler for deleting a route
async function handleDeleteRoute(req, res) {
  try {
    const { id, findBy } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    let route = null;
    
    // Try to find by persistentId first (prioritize this method)
    // Unless findBy is explicitly set to 'objectId'
    if (findBy !== 'objectId') {
      console.log(`[API] Trying to find route by persistentId for deletion: ${id}`);
      route = await Route.findOne({ persistentId: id });
      
      if (route) {
        console.log(`[API] Found route by persistentId for deletion: ${route.name}`);
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find by MongoDB _id (only if findBy isn't explicitly set to 'persistentId')
    if (!route && findBy !== 'persistentId' && mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[API] Trying to find route by MongoDB _id: ${id}`);
      route = await Route.findById(id);
    }
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Delete associated photos from Cloudinary
    if (route.photos && route.photos.length > 0) {
      console.log(`[API] Deleting ${route.photos.length} photos from Cloudinary`);
      
      for (const photo of route.photos) {
        try {
          // Extract publicId from URL or use stored publicId
          let publicId = photo.publicId;
          
          if (!publicId && photo.url) {
            publicId = extractPublicIdFromUrl(photo.url);
          }
          
          if (publicId) {
            await deleteFile(publicId);
            console.log(`[API] Deleted photo: ${publicId}`);
          } else {
            console.warn(`[API] Could not extract public ID from photo URL: ${photo.url}`);
          }
        } catch (photoError) {
          console.error(`[API] Error deleting photo: ${photoError.message}`);
          // Continue with other photos even if one fails
        }
      }
    }
    
    // Delete the embed data from Cloudinary if it exists
    if (route.embedUrl) {
      try {
        // Extract the actual public ID from the embedUrl
        console.log(`[API] Embed URL: ${route.embedUrl}`);
        
        // Parse the URL to extract the path
        const embedUrlObj = new URL(route.embedUrl);
        const pathParts = embedUrlObj.pathname.split('/');
        console.log(`[API] URL path parts:`, pathParts);
        
        // Try different approaches to delete the file
        
        // Approach 1: Use the same format as when creating the file
        const publicId1 = `embed-${route.persistentId}`;
        console.log(`[API] Attempting to delete embed data (Approach 1) - publicId: ${publicId1}, resource_type: raw, folder: embeds`);
        try {
          const result1 = await deleteFile(publicId1, { 
            resource_type: 'raw',
            type: 'upload',
            folder: 'embeds'
          });
          console.log(`[API] Approach 1 result:`, result1);
        } catch (error1) {
          console.error(`[API] Approach 1 failed:`, error1);
        }
        
        // Approach 2: Include folder in the publicId
        const publicId2 = `embeds/embed-${route.persistentId}`;
        console.log(`[API] Attempting to delete embed data (Approach 2) - publicId: ${publicId2}, resource_type: raw`);
        try {
          const result2 = await deleteFile(publicId2, { 
            resource_type: 'raw'
          });
          console.log(`[API] Approach 2 result:`, result2);
        } catch (error2) {
          console.error(`[API] Approach 2 failed:`, error2);
        }
        
        // Approach 3: Extract public ID from URL
        // Find the part after /raw/upload/ in the URL
        const uploadIndex = pathParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1 && uploadIndex + 1 < pathParts.length) {
          const extractedPublicId = pathParts.slice(uploadIndex + 1).join('/').replace(/\.\w+$/, ''); // Remove file extension
          console.log(`[API] Attempting to delete embed data (Approach 3) - extracted publicId: ${extractedPublicId}, resource_type: raw`);
          try {
            const result3 = await deleteFile(extractedPublicId, { 
              resource_type: 'raw'
            });
            console.log(`[API] Approach 3 result:`, result3);
          } catch (error3) {
            console.error(`[API] Approach 3 failed:`, error3);
          }
        } else {
          console.log(`[API] Could not extract public ID from URL for Approach 3`);
        }
        
        console.log(`[API] Attempted to delete embed data using multiple approaches`);
      } catch (embedError) {
        console.error(`[API] Error in overall embed deletion process:`, embedError);
        // Continue with route deletion even if embed data deletion fails
      }
    }
    
    // Delete the route
    const result = await Route.findByIdAndDelete(route._id);
    
    if (!result) {
      return res.status(404).json({ error: 'Failed to delete route' });
    }
    
    return res.status(200).json({ message: 'Route and associated photos deleted successfully' });
  } catch (error) {
    console.error('Delete route error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete route',
      details: error.message
    });
  }
}

// Handler for getting routes
async function handleGetRoutes(req, res) {
  try {
    const { userId, limit = 50, skip = 0, isPublic, persistentId, metadataOnly = 'true' } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by user ID if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by public status if provided
    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }
    
    // Filter by persistent ID if provided
    if (persistentId) {
      query.persistentId = persistentId;
    }
    
    // Define projection to only include essential fields when metadataOnly=true
    const projection = metadataOnly === 'true' ? {
      persistentId: 1,
      name: 1,
      type: 1,
      isPublic: 1,
      createdAt: 1,
      updatedAt: 1,
      userId: 1,
      _id: 1
    } : {};
    
    console.log(`[API] Getting routes with metadataOnly=${metadataOnly}`);
    
    // Get routes with projection
    const routes = await Route.find(query, projection)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Route.countDocuments(query);
    
    return res.status(200).json({
      routes,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Get routes error:', error);
    return res.status(500).json({ 
      error: 'Failed to get routes',
      details: error.message
    });
  }
}

// Handler for getting a single route
async function handleGetRoute(req, res) {
  try {
    const { id, findBy } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    console.log(`[API] Attempting to find route with ID: ${id}, findBy: ${findBy || 'auto'}`);
    
    // Log all available collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`[API] Available collections:`, collections.map(c => c.name));
    
    // Get a count of routes in the database
    const routeCount = await Route.countDocuments();
    console.log(`[API] Total routes in database: ${routeCount}`);
    
    // List all persistentIds of routes
    const allRoutes = await Route.find().select('persistentId name');
    console.log(`[API] All routes:`, allRoutes.map(r => ({ id: r.persistentId, name: r.name })));
    
    let route = null;
    
    // Try to find by persistentId first (prioritize this method)
    // Unless findBy is explicitly set to 'objectId'
    if (findBy !== 'objectId') {
      console.log(`[API] Trying to find route by persistentId: ${id}`);
      route = await Route.findOne({ persistentId: id });
      
      if (route) {
        console.log(`[API] Found route by persistentId: ${route.name}`);
      } else if (findBy !== 'persistentId') {
        // If not found by persistentId and findBy isn't explicitly set to 'persistentId',
        // try case-insensitive search
        console.log(`[API] Route not found by persistentId, trying case-insensitive search`);
        
        route = await Route.findOne({ 
          persistentId: { $regex: new RegExp('^' + id + '$', 'i') } 
        });
        
        if (route) {
          console.log(`[API] Found route by case-insensitive persistentId: ${route.name}`);
        }
      }
    }
    
    // If not found by persistentId and the ID is a valid ObjectId,
    // try to find by MongoDB _id (only if findBy isn't explicitly set to 'persistentId')
    if (!route && findBy !== 'persistentId' && mongoose.Types.ObjectId.isValid(id)) {
      console.log(`[API] Trying to find route by MongoDB _id: ${id}`);
      route = await Route.findById(id);
      
      if (route) {
        console.log(`[API] Found route by MongoDB _id: ${route._id}`);
      }
    }
    
    if (!route) {
      console.log(`[API] Route not found with ID: ${id}`);
      return res.status(404).json({ error: 'Route not found' });
    }
    
    console.log(`[API] Returning route: ${route.name} with ID: ${route.persistentId}`);
    return res.status(200).json(route);
  } catch (error) {
    console.error('Get route error:', error);
    return res.status(500).json({ 
      error: 'Failed to get route',
      details: error.message
    });
  }
}

// Redis is not available locally, so we'll use in-memory storage only

// Define ChunkedUploadSession schema for MongoDB fallback
const ChunkedUploadSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  persistentId: { type: String },
  totalChunks: { type: Number, required: true },
  totalSize: { type: Number, required: true },
  receivedChunks: { type: Number, default: 0 },
  isUpdate: { type: Boolean, default: false },
  isCompressed: { type: Boolean, default: false }, // Add compression flag
  chunks: { type: Map, of: Boolean, default: new Map() },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-expire after 1 hour
});

// Define ChunkedUploadChunk schema for MongoDB fallback
const ChunkedUploadChunkSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  chunkIndex: { type: Number, required: true },
  data: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-expire after 1 hour
});

// Create compound index for sessionId + chunkIndex
ChunkedUploadChunkSchema.index({ sessionId: 1, chunkIndex: 1 }, { unique: true });

// Initialize the models
let ChunkedUploadSession;
let ChunkedUploadChunk;
try {
  // Try to get the models if they exist
  ChunkedUploadSession = mongoose.model('ChunkedUploadSession');
  ChunkedUploadChunk = mongoose.model('ChunkedUploadChunk');
} catch (e) {
  // Create the models if they don't exist
  ChunkedUploadSession = mongoose.model('ChunkedUploadSession', ChunkedUploadSessionSchema);
  ChunkedUploadChunk = mongoose.model('ChunkedUploadChunk', ChunkedUploadChunkSchema);
}

// In-memory storage for serverless environments where Redis might not be available
// Using global object to ensure persistence across function invocations
if (!global.memoryStorage) {
  global.memoryStorage = {
    sessions: {},
    chunks: {}
  };
}
const memoryStorage = global.memoryStorage;

// Debug function to log memory storage state
function logMemoryStorageState() {
  console.log(`[API] Memory storage state: ${Object.keys(memoryStorage.sessions).length} sessions`);
  for (const sessionId in memoryStorage.sessions) {
    console.log(`[API] Session ${sessionId}: ${JSON.stringify(memoryStorage.sessions[sessionId])}`);
  }
}

// Helper function to get session info from storage (Redis, MongoDB, or memory)
async function getSessionInfo(sessionId) {
  // Try Redis first
  let sessionInfo = await getCache(`chunked:${sessionId}:info`);
  if (sessionInfo) {
    return { sessionInfo, source: 'redis' };
  }
  
  // Try MongoDB next
  try {
    const session = await ChunkedUploadSession.findOne({ sessionId });
    if (session) {
      // Convert MongoDB document to plain object
      sessionInfo = session.toObject();
      // Convert Map to plain object for chunks
      sessionInfo.chunks = Object.fromEntries(session.chunks);
      return { sessionInfo, source: 'mongodb' };
    }
  } catch (error) {
    console.error('[API] Error getting session from MongoDB:', error);
  }
  
  // Try memory storage last
  if (memoryStorage.sessions[sessionId]) {
    return { sessionInfo: memoryStorage.sessions[sessionId], source: 'memory' };
  }
  
  // Session not found in any storage
  return { sessionInfo: null, source: null };
}

// Helper function to store session info in storage (Redis, MongoDB, or memory)
async function storeSessionInfo(sessionId, sessionInfo) {
  // Try Redis first
  const redisSuccess = await setCache(`chunked:${sessionId}:info`, sessionInfo, 3600);
  
  // If Redis successful, return
  if (redisSuccess) {
    return { success: true, source: 'redis' };
  }
  
  // Try MongoDB next
  try {
    // Convert chunks object to Map for MongoDB
    const chunksMap = new Map(Object.entries(sessionInfo.chunks));
    
    // Create or update session in MongoDB
    await ChunkedUploadSession.findOneAndUpdate(
      { sessionId },
      { 
        ...sessionInfo,
        chunks: chunksMap
      },
      { upsert: true, new: true }
    );
    
    return { success: true, source: 'mongodb' };
  } catch (error) {
    console.error('[API] Error storing session in MongoDB:', error);
  }
  
  // Fall back to memory storage
  memoryStorage.sessions[sessionId] = sessionInfo;
  return { success: true, source: 'memory' };
}

// Helper function to get chunk data from storage (Redis, MongoDB, or memory)
async function getChunkData(sessionId, chunkIndex) {
  // Try Redis first
  let chunkData = await getCache(`chunked:${sessionId}:chunk:${chunkIndex}`);
  if (chunkData) {
    return { chunkData, source: 'redis' };
  }
  
  // Try MongoDB next
  try {
    const chunk = await ChunkedUploadChunk.findOne({ sessionId, chunkIndex });
    if (chunk) {
      return { chunkData: chunk.data, source: 'mongodb' };
    }
  } catch (error) {
    console.error('[API] Error getting chunk from MongoDB:', error);
  }
  
  // Try memory storage last
  if (memoryStorage.chunks && 
      memoryStorage.chunks[sessionId] && 
      memoryStorage.chunks[sessionId][chunkIndex] !== undefined) {
    return { chunkData: memoryStorage.chunks[sessionId][chunkIndex], source: 'memory' };
  }
  
  // Chunk not found in any storage
  return { chunkData: null, source: null };
}

// Helper function to store chunk data in storage (Redis, MongoDB, or memory)
async function storeChunkData(sessionId, chunkIndex, data) {
  // Try Redis first
  const redisSuccess = await setCache(`chunked:${sessionId}:chunk:${chunkIndex}`, data, 3600);
  
  // If Redis successful, return
  if (redisSuccess) {
    return { success: true, source: 'redis' };
  }
  
  // Try MongoDB next
  try {
    // Create or update chunk in MongoDB
    await ChunkedUploadChunk.findOneAndUpdate(
      { sessionId, chunkIndex },
      { sessionId, chunkIndex, data },
      { upsert: true, new: true }
    );
    
    return { success: true, source: 'mongodb' };
  } catch (error) {
    console.error('[API] Error storing chunk in MongoDB:', error);
  }
  
  // Fall back to memory storage
  if (!memoryStorage.chunks) {
    memoryStorage.chunks = {};
  }
  if (!memoryStorage.chunks[sessionId]) {
    memoryStorage.chunks[sessionId] = {};
  }
  memoryStorage.chunks[sessionId][chunkIndex] = data;
  return { success: true, source: 'memory' };
}

// Helper function to clean up session data from all storage
async function cleanupSessionData(sessionId, totalChunks) {
  // Clean up Redis
  try {
    await deleteCache(`chunked:${sessionId}:info`);
    for (let i = 0; i < totalChunks; i++) {
      await deleteCache(`chunked:${sessionId}:chunk:${i}`);
    }
  } catch (error) {
    console.error('[API] Error cleaning up Redis data:', error);
  }
  
  // Clean up MongoDB
  try {
    await ChunkedUploadSession.deleteOne({ sessionId });
    await ChunkedUploadChunk.deleteMany({ sessionId });
  } catch (error) {
    console.error('[API] Error cleaning up MongoDB data:', error);
  }
  
  // Clean up memory storage
  if (memoryStorage.sessions && memoryStorage.sessions[sessionId]) {
    delete memoryStorage.sessions[sessionId];
  }
  if (memoryStorage.chunks && memoryStorage.chunks[sessionId]) {
    delete memoryStorage.chunks[sessionId];
  }
}

// Start a chunked upload session
async function handleStartChunkedUpload(req, res) {
  try {
    const { persistentId, totalChunks, totalSize, isUpdate, isCompressed } = req.body;
    
    // Generate a session ID
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Session info object
    const sessionInfo = {
      persistentId,
      totalChunks,
      totalSize,
      receivedChunks: 0,
      isUpdate,
      isCompressed: !!isCompressed, // Store compression flag
      chunks: {},
      createdAt: Date.now()
    };
    
    console.log(`[API] Creating chunked upload session: ${sessionId}`);
    
    // Store session info using helper function
    const { success, source } = await storeSessionInfo(sessionId, sessionInfo);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to create upload session' });
    }
    
    console.log(`[API] Session stored in ${source} storage`);
    
    // Log memory storage state for debugging if using memory storage
    if (source === 'memory') {
      logMemoryStorageState();
    }
    
    console.log(`[API] Chunked upload session created: ${sessionId} for ${isUpdate ? 'update' : 'new'} route`);
    
    return res.status(200).json({ sessionId });
  } catch (error) {
    console.error('Start chunked upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to start chunked upload',
      details: error.message
    });
  }
}

// Handle a chunk upload
async function handleUploadChunk(req, res) {
  try {
    const { sessionId, chunkIndex, data } = req.body;
    
    console.log(`[API] Processing chunk ${chunkIndex} for session ${sessionId}`);
    
    // Log memory storage state before processing
    console.log(`[API] Memory storage state BEFORE processing chunk:`);
    logMemoryStorageState();
    
    // Get session info using helper function
    const { sessionInfo, source: sessionSource } = await getSessionInfo(sessionId);
    
    // If session not found in any storage
    if (!sessionInfo) {
      console.log(`[API] Session ${sessionId} not found in any storage`);
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }
    
    console.log(`[API] Session info retrieved from ${sessionSource} storage`);
    
    // Store chunk data using helper function
    const { success, source: chunkSource } = await storeChunkData(sessionId, chunkIndex, data);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to store chunk data' });
    }
    
    console.log(`[API] Chunk ${chunkIndex} stored in ${chunkSource} storage`);
    
    // Update session info
    sessionInfo.receivedChunks += 1;
    sessionInfo.chunks[chunkIndex] = true;
    
    // Update session info using helper function
    const updateResult = await storeSessionInfo(sessionId, sessionInfo);
    
    if (!updateResult.success) {
      return res.status(500).json({ error: 'Failed to update session info' });
    }
    
    console.log(`[API] Session info updated in ${updateResult.source} storage`);
    console.log(`[API] Received chunk ${chunkIndex + 1}/${sessionInfo.totalChunks} for session ${sessionId}`);
    
    // Log memory storage state after processing
    console.log(`[API] Memory storage state AFTER processing chunk:`);
    logMemoryStorageState();
    
    return res.status(200).json({ 
      success: true,
      receivedChunks: sessionInfo.receivedChunks,
      totalChunks: sessionInfo.totalChunks
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload chunk',
      details: error.message
    });
  }
}

// Complete a chunked upload
async function handleCompleteChunkedUpload(req, res) {
  try {
    const { sessionId } = req.body;
    
    console.log(`[API] Processing completion request for session ${sessionId}`);
    
    // Get session info using helper function
    const { sessionInfo, source: sessionSource } = await getSessionInfo(sessionId);
    
    // If session not found in any storage
    if (!sessionInfo) {
      console.log(`[API] Session ${sessionId} not found in any storage`);
      return res.status(404).json({ error: 'Upload session not found or expired' });
    }
    
    console.log(`[API] Session info retrieved from ${sessionSource} storage`);
    
    // Check if all chunks are received
    if (sessionInfo.receivedChunks !== sessionInfo.totalChunks) {
      console.log(`[API] Not all chunks received: ${sessionInfo.receivedChunks}/${sessionInfo.totalChunks}`);
      return res.status(400).json({ 
        error: 'Not all chunks received',
        receivedChunks: sessionInfo.receivedChunks,
        totalChunks: sessionInfo.totalChunks
      });
    }
    
    console.log(`[API] Reassembling ${sessionInfo.totalChunks} chunks for session ${sessionId}`);
    
    // Reassemble the data
    let completeData = '';
    for (let i = 0; i < sessionInfo.totalChunks; i++) {
      // Get chunk data using helper function
      const { chunkData, source: chunkSource } = await getChunkData(sessionId, i);
      
      // If chunk not found in any storage
      if (!chunkData) {
        console.log(`[API] Chunk ${i} not found in any storage`);
        return res.status(500).json({ error: `Chunk ${i} not found or expired` });
      }
      
      console.log(`[API] Chunk ${i} retrieved from ${chunkSource} storage`);
      completeData += chunkData;
    }
    
    console.log(`[API] All chunks retrieved successfully`);
    
    // Decompress if needed
    let jsonData = completeData;
    if (sessionInfo.isCompressed) {
      try {
        jsonData = await decompressData(completeData);
        console.log(`[API] Successfully decompressed data for session ${sessionId}`);
      } catch (decompressError) {
        console.error(`[API] Error decompressing data:`, decompressError);
        return res.status(400).json({ 
          error: 'Failed to decompress data',
          details: decompressError.message
        });
      }
    }
    
    // Parse the reassembled data
    let routeData;
    try {
      routeData = JSON.parse(jsonData);
      console.log(`[API] Successfully parsed data for session ${sessionId}, size: ${jsonData.length} bytes`);
    } catch (parseError) {
      console.error(`[API] Error parsing reassembled data:`, parseError);
      return res.status(400).json({ 
        error: 'Failed to parse reassembled data',
        details: parseError.message
      });
    }
    
    // Process the route data using existing handlers
    let result;
    
    // Save the original request body and query
    const originalBody = req.body;
    const originalQuery = req.query;
    
    try {
      if (sessionInfo.isUpdate) {
        // Update existing route
        req.body = routeData;
        req.query.id = sessionInfo.persistentId;
        await handleUpdateRoute(req, res);
      } else {
        // Create new route
        req.body = routeData;
        await handleCreateRoute(req, res);
      }
      
      // The response has already been sent by the handler
      result = true;
    } catch (error) {
      console.error(`[API] Error processing reassembled data:`, error);
      
      // Restore the original request body and query
      req.body = originalBody;
      req.query = originalQuery;
      
      return res.status(500).json({ 
        error: 'Failed to process reassembled data',
        details: error.message
      });
    }
    
    // Clean up all storage using helper function
    await cleanupSessionData(sessionId, sessionInfo.totalChunks);
    console.log(`[API] Cleaned up temporary data for session ${sessionId}`);
    
    // If we get here, the response has already been sent by the handler
    return result;
  } catch (error) {
    console.error('Complete chunked upload error:', error);
    return res.status(500).json({ 
      error: 'Failed to complete chunked upload',
      details: error.message
    });
  }
}

// Handler to get map overview data
async function getMapOverview(req, res) {
  try {
    const persistentId = req.params.persistentId;
    
    if (!persistentId) {
      return res.status(400).json({ error: 'Missing persistentId' });
    }
    
    // Find the route
    const route = await Route.findOne({ persistentId });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Return just the map overview data
    return res.status(200).json(route.mapOverview || { description: '' });
  } catch (error) {
    console.error('Get map overview error:', error);
    return res.status(500).json({ 
      error: 'Failed to get map overview',
      details: error.message
    });
  }
}

// Handler for partial updates
async function handlePartialUpdate(req, res) {
  try {
    const persistentId = req.query.id || req.params?.persistentId;
    
    if (!persistentId) {
      return res.status(400).json({ error: 'Missing persistentId' });
    }
    
    console.log(`[API] Processing partial update for route with persistentId: ${persistentId}`);
    console.log(`[API] Update fields:`, Object.keys(req.body).join(', '));
    
    // Find the route
    const route = await Route.findOne({ persistentId });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Extract only the fields that need updating
    const updateFields = req.body;
    
    // Apply updates to specific fields only
    Object.keys(updateFields).forEach(field => {
      if (field !== 'id' && field !== 'persistentId' && field !== 'userId') {
        if (field === 'mapOverview') {
          route.mapOverview = {
            ...route.mapOverview || {},
            ...updateFields.mapOverview
          };
          console.log(`[API] Updated map overview:`, route.mapOverview);
        } 
        else if (field === 'headerSettings') {
          route.headerSettings = {
            ...route.headerSettings || {},
            ...updateFields.headerSettings
          };
          console.log(`[API] Updated header settings:`, route.headerSettings);
        }
        else if (field === 'description') {
          route.description = updateFields.description;
          
          // If description is provided separately, also update it in the first route
          if (route.routes && route.routes.length > 0) {
            console.log(`[API] Updating description in first route`);
            route.routes[0].description = updateFields.description;
          }
        }
        else if (field === 'staticMapUrl') {
          route.staticMapUrl = updateFields.staticMapUrl;
          console.log(`[API] Updated static map URL: ${updateFields.staticMapUrl}`);
        }
        else if (field === 'staticMapPublicId') {
          route.staticMapPublicId = updateFields.staticMapPublicId;
          console.log(`[API] Updated static map public ID: ${updateFields.staticMapPublicId}`);
        }
        else {
          route[field] = updateFields[field];
          console.log(`[API] Updated field ${field}`);
        }
      }
    });
    
    // Update timestamp
    route.updatedAt = new Date();
    
    // Save the route with only the changed fields
    await route.save();
    console.log(`[API] Saved partial update for route: ${route.name}`);
    
    // Update embed data if needed (only for specific fields that affect the embed)
    const embedAffectingFields = [
      'name', 'routes', 'mapState', 'pois', 'lines',
      'photos', 'description', 'headerSettings', 'mapOverview',
      'staticMapUrl', 'staticMapPublicId' // Add static map fields to trigger embed update
    ];
    
    const needsEmbedUpdate = Object.keys(updateFields)
      .some(field => embedAffectingFields.includes(field));
    
    if (needsEmbedUpdate) {
      try {
        console.log(`[API] Generating updated embed data for route: ${route.name}`);
        
        // Create the embed data package
        const embedData = {
          id: route._id,
          persistentId: route.persistentId,
          name: route.name,
          type: route.type, // Include the route type
          eventDate: route.eventDate, // Include the event date
          routes: route.routes.map(r => ({
            routeId: r.routeId,
            name: r.name,
            color: r.color,
            geojson: r.geojson,
            surface: r.surface,
            unpavedSections: r.unpavedSections,
            description: r.description
          })),
          mapState: route.mapState,
          pois: route.pois || { draggable: [], places: [] },
          lines: route.lines || [],
          photos: route.photos || [],
          elevation: route.routes.map(r => r.surface?.elevationProfile || []),
          description: route.description,
          headerSettings: route.headerSettings,
          mapOverview: route.mapOverview || { description: '' },
          staticMapUrl: route.staticMapUrl, // Include the static map URL
          staticMapPublicId: route.staticMapPublicId, // Include the static map public ID
          _type: 'loaded',
          _loadedState: {
            name: route.name,
            type: route.type, // Include the route type in _loadedState
            eventDate: route.eventDate, // Include the event date in _loadedState
            pois: route.pois || { draggable: [], places: [] },
            lines: route.lines || [],
            photos: route.photos || [],
            headerSettings: route.headerSettings,
            mapOverview: route.mapOverview || { description: '' },
            staticMapUrl: route.staticMapUrl, // Include the static map URL in _loadedState
            staticMapPublicId: route.staticMapPublicId // Include the static map public ID in _loadedState
          }
        };
        
        // Upload to Cloudinary with the same public ID to replace the existing file
        const publicId = `embed-${route.persistentId}`;
        console.log(`[API] Uploading updated embed data to Cloudinary with public ID: ${publicId}`);
        
        // Add a timestamp to force a version update
        const options = {
          timestamp: Date.now()
        };
        
        const result = await uploadJsonData(embedData, publicId, options);
        
        // Update the route with the embed URL if it changed
        if (route.embedUrl !== result.url) {
          route.embedUrl = result.url;
          await route.save();
        }
        
        console.log(`[API] Updated embed data uploaded successfully: ${result.url}`);
      } catch (embedError) {
        console.error(`[API] Error generating updated embed data:`, embedError);
        // Continue even if embed data generation fails
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Route partially updated',
      updatedFields: Object.keys(updateFields).filter(f => f !== 'id' && f !== 'persistentId' && f !== 'userId')
    });
  } catch (error) {
    console.error('Partial update error:', error);
    return res.status(500).json({ 
      error: 'Failed to update route',
      details: error.message
    });
  }
}

// Route handler
const handler = async (req, res) => {
  // Ensure database connection
  await connectToDatabase();
  
  // Check if the request contains compressed data
  if (req.headers['x-content-encoding'] === 'gzip') {
    try {
      // Get the request body as string
      let bodyData = req.body;
      
      // If the content type is text/plain, the body is already a string
      // If not, convert it to string if it's an object
      if (typeof bodyData !== 'string') {
        bodyData = JSON.stringify(bodyData);
      }
      
      // Decompress the request body
      const decompressedBody = await decompressData(bodyData);
      
      // Parse the JSON
      req.body = JSON.parse(decompressedBody);
      
      console.log('[API] Successfully decompressed request body');
    } catch (error) {
      console.error('[API] Error decompressing request body:', error);
      // Continue with the original body if decompression fails
    }
  }
  
  // Parse the URL to extract path parameters
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  
  // Improved path parsing - filter out empty strings and handle URL encoding
  const pathParts = url.pathname.split('/').filter(part => part.length > 0);
  
  console.log(`[API] Request: ${req.method} ${url.pathname}`);
  console.log(`[API] Path parts after filtering:`, pathParts);
  
  // Handle chunked upload endpoints
  if (pathParts.includes('chunked')) {
    console.log(`[API] Handling chunked upload request: ${url.pathname}`);
    
    // Find the index of 'chunked' in the path
    const chunkedIndex = pathParts.indexOf('chunked');
    
    // Get the action (the part after 'chunked')
    const action = chunkedIndex < pathParts.length - 1 ? pathParts[chunkedIndex + 1] : null;
    
    console.log(`[API] Chunked upload action: ${action}`);
    
    if (req.method === 'POST') {
      if (action === 'start') {
        return handleStartChunkedUpload(req, res);
      } else if (action === 'upload') {
        return handleUploadChunk(req, res);
      } else if (action === 'complete') {
        return handleCompleteChunkedUpload(req, res);
      }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Handle partial update endpoint
  if (pathParts.includes('partial') && (req.method === 'PATCH' || req.method === 'PUT')) {
    console.log(`[API] Handling partial update request: ${url.pathname}`);
    
    // Find the index of 'partial' in the path
    const partialIndex = pathParts.indexOf('partial');
    
    // Get the persistentId (the part after 'partial')
    if (partialIndex < pathParts.length - 1) {
      req.params = { persistentId: pathParts[partialIndex + 1] };
      return handlePartialUpdate(req, res);
    }
    
    return res.status(400).json({ error: 'Missing persistentId in partial update request' });
  }
  
  // Extract persistentId from path if present (e.g., /api/routes/[persistentId])
  let persistentId = null;
  
  // Check if this is a route request with a persistentId
  if (pathParts.length > 0) {
    // Check if the last part of the path is the persistentId
    const lastPart = pathParts[pathParts.length - 1];
    
    // If the last part is not 'routes', 'save', or contains a query string,
    // it's likely a persistentId
    if (lastPart && 
        !['routes', 'save', 'public', 'chunked', 'start', 'upload', 'complete', 'partial'].includes(lastPart) && 
        lastPart.indexOf('?') === -1) {
      persistentId = decodeURIComponent(lastPart);
      console.log(`[API] Detected persistentId from path: ${persistentId}`);
      
      // Add the persistentId to query params for existing handlers
      req.query.id = persistentId;
    }
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'POST':
      // Handle route creation
      return handleCreateRoute(req, res);
    
    case 'PUT':
      // Handle route update
      return handleUpdateRoute(req, res);
    
    case 'DELETE':
      // Handle route deletion
      return handleDeleteRoute(req, res);
    
    case 'GET':
      // Check if it's a map overview request
      if (req.query.id && req.query.mapoverview === 'true') {
        req.params = { persistentId: req.query.id };
        return getMapOverview(req, res);
      }
      
      // Check if it's a single route request
      if (req.query.id) {
        return handleGetRoute(req, res);
      }
      
      // Otherwise, it's a routes list request
      return handleGetRoutes(req, res);
    
    case 'PATCH':
      // Handle partial update if it wasn't caught by the specific endpoint
      if (req.query.id) {
        return handlePartialUpdate(req, res);
      }
      
      return res.status(400).json({ error: 'Missing route ID for partial update' });
    
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
};

// Handler for the map overview endpoint
const mapOverviewHandler = async (req, res) => {
  // Ensure database connection
  await connectToDatabase();
  
  // Extract persistentId from path
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(part => part.length > 0);
  
  // Find the index of 'mapoverview' in the path
  const mapOverviewIndex = pathParts.indexOf('mapoverview');
  
  // Get the persistentId (the part before 'mapoverview')
  if (mapOverviewIndex > 0) {
    const persistentId = pathParts[mapOverviewIndex - 1];
    req.params = { persistentId };
    return getMapOverview(req, res);
  }
  
  return res.status(400).json({ error: 'Missing persistentId in map overview request' });
};

// Export the handlers with middleware - make auth optional for debugging
export default (req, res) => {
  // Parse the URL to extract path parameters
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(part => part.length > 0);
  
  // Check if this is a map overview request
  if (pathParts.includes('mapoverview')) {
    return createApiHandler(mapOverviewHandler, { requireDb: true, requireAuth: false })(req, res);
  }
  
  // Otherwise, use the main handler
  return createApiHandler(handler, { requireDb: true, requireAuth: false })(req, res);
};
