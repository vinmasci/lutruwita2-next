import mongoose from 'mongoose';

const poiSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Use client-generated UUID as _id
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
      validator: function(this: any, v: string | undefined) {
        if (this.type === 'place') {
          return typeof v === 'string' && v.length > 0;
        }
        return true;
      } as (this: any, v: string | undefined) => boolean,
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
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Add index for geospatial queries
poiSchema.index({ 'position.lat': 1, 'position.lng': 1 });

export const POI = mongoose.model('POI', poiSchema);
