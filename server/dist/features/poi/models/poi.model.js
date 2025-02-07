"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POI = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const poiSchema = new mongoose_1.default.Schema({
    _id: { type: String, required: true, get: (v) => v }, // Use client-generated UUID as _id and prevent casting
    userId: { type: String, required: true },
    position: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['draggable', 'place'] },
    category: { type: String, required: true },
    icon: { type: String, required: true },
    placeId: {
        type: String,
        validate: {
            validator: function (v) {
                if (this.type === 'place') {
                    return typeof v === 'string' && v.length > 0;
                }
                return true;
            },
            message: 'placeId is required for place type POIs'
        }
    },
    // Optional fields
    description: String,
    photos: [{
            url: String,
            caption: String
        }],
    style: {
        color: String,
        size: Number
    }
}, {
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            ret.id = ret._id.toString();
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    _id: false // Disable Mongoose's automatic _id handling
});
// Add index for geospatial queries
poiSchema.index({ 'position.lat': 1, 'position.lng': 1 });
exports.POI = mongoose_1.default.model('POI', poiSchema);
