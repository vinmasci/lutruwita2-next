"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const photoSchema = new mongoose_1.default.Schema({
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
const poiSchema = new mongoose_1.default.Schema({
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
const draggablePOISchema = poiSchema.clone();
draggablePOISchema.add({
    type: { type: String, enum: ['draggable'], required: true }
});
const placeNamePOISchema = poiSchema.clone();
placeNamePOISchema.add({
    type: { type: String, enum: ['place'], required: true },
    placeId: { type: String, required: true }
});
const placeSchema = new mongoose_1.default.Schema({
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
const routeSchema = new mongoose_1.default.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['tourism', 'event', 'bikepacking', 'single'],
        required: true
    },
    isPublic: { type: Boolean, required: true },
    userId: { type: String, required: true },
    mapState: {
        zoom: { type: Number, required: true },
        center: { type: [Number], required: true },
        bearing: { type: Number, required: true },
        pitch: { type: Number, required: true },
        style: String
    },
    routes: [{
            id: { type: String, required: true },
            routeId: String,
            matchedIndices: [Number],
            name: { type: String, required: true },
            color: { type: String, required: true },
            isVisible: { type: Boolean, required: true },
            gpxData: { type: String, required: true },
            rawGpx: { type: String, required: true },
            geojson: { type: mongoose_1.default.Schema.Types.Mixed, required: true },
            surface: {
                surfaceTypes: [{
                        type: { type: String, enum: ['road', 'trail', 'water', 'unknown'], required: true },
                        percentage: { type: Number, required: true },
                        distance: { type: Number, required: true }
                    }],
                elevationProfile: [{
                        elevation: { type: Number, required: true },
                        distance: { type: Number, required: true },
                        grade: { type: Number, required: true }
                    }],
                totalDistance: { type: Number, required: true },
                roughness: { type: Number, required: true },
                difficultyRating: { type: Number, required: true },
                surfaceQuality: { type: Number, required: true }
            },
            mapboxMatch: {
                geojson: { type: mongoose_1.default.Schema.Types.Mixed, required: true },
                confidence: { type: Number, required: true },
                matchingStatus: { type: String, enum: ['matched', 'partial', 'failed'], required: true },
                debugData: {
                    rawTrace: mongoose_1.default.Schema.Types.Mixed,
                    matchedTrace: mongoose_1.default.Schema.Types.Mixed,
                    matchingPoints: Number,
                    distanceDeviation: Number
                }
            },
            unpavedSections: [{
                    startIndex: { type: Number, required: true },
                    endIndex: { type: Number, required: true },
                    coordinates: { type: [[Number]], required: true },
                    surfaceType: { type: String, required: true }
                }],
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
            status: {
                processingState: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], required: true },
                progress: { type: Number, required: true },
                error: {
                    code: String,
                    message: String,
                    details: String
                }
            },
            debug: {
                rawTrace: mongoose_1.default.Schema.Types.Mixed,
                matchedTrace: mongoose_1.default.Schema.Types.Mixed,
                timings: { type: Map, of: Number },
                warnings: [String]
            }
        }],
    photos: [photoSchema],
    pois: {
        draggable: [draggablePOISchema],
        places: [placeNamePOISchema]
    },
    places: [placeSchema]
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.createdAt = ret.createdAt.toISOString();
            ret.updatedAt = ret.updatedAt.toISOString();
            delete ret.__v;
            delete ret._id;
        }
    }
});
// Indexes
routeSchema.index({ userId: 1 });
routeSchema.index({ type: 1 });
routeSchema.index({ isPublic: 1 });
routeSchema.index({ createdAt: -1 });
exports.RouteModel = mongoose_1.default.model('Route', routeSchema);
