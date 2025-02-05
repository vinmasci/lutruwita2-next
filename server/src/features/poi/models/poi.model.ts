import mongoose from 'mongoose';
import { POICategory, POIIconName } from '../../../shared/types/poi.types';

const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: String,
  createdAt: { type: String, required: true }
});

const styleSchema = new mongoose.Schema({
  color: String,
  size: Number
});

const poiSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['draggable', 'place'],
    required: true
  },
  position: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  name: { type: String, required: true },
  description: String,
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
  photos: [photoSchema],
  style: styleSchema,
  placeId: String, // Only for place type POIs
  userId: { type: String, required: true }, // Added for authentication
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true }
}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Convert MongoDB _id to id if needed
      if (!ret.id && ret._id) {
        ret.id = ret._id.toString();
      }
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Indexes
poiSchema.index({ id: 1 });
poiSchema.index({ userId: 1 });
poiSchema.index({ type: 1 });
poiSchema.index({ 'position.lat': 1, 'position.lng': 1 });

export const POI = mongoose.model('POI', poiSchema);
