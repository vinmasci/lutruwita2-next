import mongoose from 'mongoose';
import { SavedRouteState } from '../types/route.types';

// These surface types are from MapTiler source - do not modify without checking MapTiler data
const VALID_SURFACE_TYPES = [
  // Paved surfaces
  'paved', 'asphalt', 'concrete', 'compacted', 'sealed', 'bitumen', 'tar', 'chipseal',
  // Unpaved surfaces
  'unpaved', 'gravel', 'fine', 'fine_gravel', 'dirt', 'earth', 'ground', 'sand', 'grass',
  // Highway types
  'track', 'trail', 'path'
] as const;

// Photo schema - used for route photo attachments
const photoSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  dateAdded: { type: String, required: true },
  coordinates: {
    lat: Number,
    lng: Number
  },
  rotation: Number,
  altitude: Number
});

// POI base schema - for points of interest along routes
const poiSchema = new mongoose.Schema({
  id: { type: String, required: true },
  position: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  name: { type: String, required: true },
  description: String,
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  category: {
    type: String,
    enum: [
      'road-information',
      'accommodation',
      'food-drink',
      'natural-features',
      'event-information',
      'town-services',
      'transportation'
    ],
    required: true
  },
  icon: { type: String, required: true },
  photos: [{
    url: { type: String, required: true },
    caption: String,
    createdAt: { type: String, required: true }
  }],
  style: {
    color: String,
    size: Number
  }
});

// POI variants
const draggablePOISchema = poiSchema.clone();
draggablePOISchema.add({
  type: { type: String, enum: ['draggable'], required: true }
});

const placeNamePOISchema = poiSchema.clone();
placeNamePOISchema.add({
  type: { type: String, enum: ['place'], required: true },
  placeId: { type: String, required: true }
});

// Places schema - for named locations
const placeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  photos: [{
    url: { type: String, required: true },
    caption: String,
    createdAt: { type: String, required: true }
  }],
  coordinates: { type: [Number], required: true },
  updatedAt: { type: String, required: true }
});

// Main route schema
const routeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['tourism', 'event', 'bikepacking', 'single'],
    required: true
  },
  isPublic: { type: Boolean, required: true },
  userId: { type: String, required: true },
  
  // Map view state
  mapState: {
    zoom: { type: Number, required: true },
    center: { type: [Number], required: true },
    bearing: { type: Number, required: true },
    pitch: { type: Number, required: true },
    style: String
  },

  // Route data array - can contain multiple routes
  routes: [{
    id: { type: String, required: true },
    routeId: String,
    matchedIndices: [Number],
    name: { type: String, required: true },
    color: { type: String, required: true },
    isVisible: { type: Boolean, required: true },
    gpxData: { type: String, required: true },
    rawGpx: { type: String, required: true },
    geojson: { type: mongoose.Schema.Types.Mixed, required: true },

    // Surface information - core part of route analysis
    surface: {
      surfaceTypes: [{
        type: { 
          type: String, 
          enum: VALID_SURFACE_TYPES,
          required: true 
        },
        percentage: { type: Number, required: true },
        distance: { type: Number, required: true }
      }],
      elevationProfile: [{
        elevation: { type: Number, required: true },
        distance: { type: Number, required: true },
        grade: { type: Number, required: true }
      }],
      // Optional analysis fields
      totalDistance: { type: Number },
      roughness: { type: Number },
      difficultyRating: { type: Number },
      surfaceQuality: { type: Number }
    },

    // Optional Mapbox matching data
    mapboxMatch: {
      geojson: { type: mongoose.Schema.Types.Mixed },
      confidence: { type: Number },
      matchingStatus: { 
        type: String, 
        enum: ['matched', 'partial', 'failed']
      },
      debugData: {
        rawTrace: mongoose.Schema.Types.Mixed,
        matchedTrace: mongoose.Schema.Types.Mixed,
        matchingPoints: Number,
        distanceDeviation: Number
      }
    },

    // Unpaved section markers
    unpavedSections: [{
      startIndex: { type: Number, required: true },
      endIndex: { type: Number, required: true },
      coordinates: { type: [[Number]], required: true },
      surfaceType: { 
        type: String, 
        enum: VALID_SURFACE_TYPES,
        required: true 
      }
    }],

    // Route statistics
    statistics: {
      totalDistance: { type: Number, required: true },
      elevationGain: { type: Number, required: true },
      elevationLoss: { type: Number, required: true },
      maxElevation: { type: Number, required: true },
      minElevation: { type: Number, required: true },
      averageSpeed: { type: Number, required: true },
      movingTime: { type: Number, required: true },
      totalTime: { type: Number, required: true }
    },

    // Processing status
    status: {
      processingState: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], required: true },
      progress: { type: Number, required: true },
      error: {
        code: String,
        message: String,
        details: String
      }
    },

    // Debug information
    debug: {
      rawTrace: mongoose.Schema.Types.Mixed,
      matchedTrace: mongoose.Schema.Types.Mixed,
      timings: { type: Map, of: Number },
      warnings: [String]
    }
  }],

  // Associated data
  photos: [photoSchema],
  pois: {
    draggable: [draggablePOISchema],
    places: [placeNamePOISchema]
  },
  places: [placeSchema]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.createdAt = ret.createdAt.toISOString();
      ret.updatedAt = ret.updatedAt.toISOString();
      delete ret.__v;
      delete ret._id;
    }
  }
});

// Indexes for efficient queries
routeSchema.index({ userId: 1 });
routeSchema.index({ type: 1 });
routeSchema.index({ isPublic: 1 });
routeSchema.index({ createdAt: -1 });

export const RouteModel = mongoose.model<SavedRouteState>('Route', routeSchema);
