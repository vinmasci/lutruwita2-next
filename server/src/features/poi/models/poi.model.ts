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
  routeId: { type: String },
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
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id.toString();  // Convert MongoDB _id to string id for client
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      // Ensure type is preserved for proper type discrimination
      ret.type = ret.type;
      // Ensure placeId is only included for place type POIs
      if (ret.type !== 'place') {
        delete ret.placeId;
      }
      return ret;
    }
  },
  toObject: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id.toString();  // Convert MongoDB _id to string id for client
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      // Ensure type is preserved for proper type discrimination
      ret.type = ret.type;
      // Ensure placeId is only included for place type POIs
      if (ret.type !== 'place') {
        delete ret.placeId;
      }
      return ret;
    }
  }
});

export const POIModel = mongoose.model('POI', poiSchema);
