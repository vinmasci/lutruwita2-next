import mongoose from 'mongoose';

/**
 * Schema for draft routes
 * Includes TTL index to automatically expire drafts after 14 days
 */
const DraftRouteSchema = new mongoose.Schema({
  // Unique identifier for the draft
  draftId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  
  // User ID from Auth0 (sub field)
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Basic metadata
  name: { 
    type: String, 
    default: 'Untitled Draft' 
  },
  
  type: { 
    type: String, 
    default: 'bikepacking',
    enum: ['tourism', 'event', 'bikepacking', 'single']
  },
  
  // Actual draft data - stored as a flexible object
  data: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true 
  },
  
  // Tracking fields
  lastModified: { 
    type: Date, 
    default: Date.now 
  },
  
  // Creation timestamp with TTL index (14 days)
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 60 * 60 * 24 * 14 // 14 days in seconds
  }
});

// Create indexes
DraftRouteSchema.index({ userId: 1, lastModified: -1 });

// Create or get the model
let DraftRoute;
try {
  // Try to get the model if it already exists
  DraftRoute = mongoose.model('DraftRoute');
} catch (error) {
  // If the model doesn't exist, create it
  DraftRoute = mongoose.model('DraftRoute', DraftRouteSchema);
}

export default DraftRoute;
