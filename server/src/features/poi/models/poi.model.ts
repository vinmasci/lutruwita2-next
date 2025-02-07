import mongoose from 'mongoose';

const poiPhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  caption: { type: String }
});

const poiStyleSchema = new mongoose.Schema({
  color: { type: String },
  size: { type: Number }
});

const poiSchema = new mongoose.Schema({
  position: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
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

export const POIModel = mongoose.model('POI', poiSchema);
