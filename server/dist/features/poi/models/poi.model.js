"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POIModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const poiPhotoSchema = new mongoose_1.default.Schema({
    url: { type: String, required: true },
    caption: { type: String }
});
const poiStyleSchema = new mongoose_1.default.Schema({
    color: { type: String },
    size: { type: Number }
});
const poiSchema = new mongoose_1.default.Schema({
    coordinates: {
        type: [Number],
        required: true,
        validate: {
            validator: function (v) {
                return Array.isArray(v) && v.length === 2;
            },
            message: 'Coordinates must be [longitude, latitude]'
        }
    },
    name: { type: String, required: true },
    description: { type: String },
    category: {
        type: String,
        required: true,
        enum: [
            'road-information',
            'accommodation',
            'food-drink',
            'natural-features',
            'town-services',
            'transportation',
            'event-information'
        ]
    },
    icon: {
        type: String,
        required: true
    },
    photos: [poiPhotoSchema],
    style: poiStyleSchema,
    type: {
        type: String,
        required: true,
        enum: ['draggable', 'place']
    },
    placeId: { type: String } // Only for place type POIs
});
exports.POIModel = mongoose_1.default.model('POI', poiSchema);
