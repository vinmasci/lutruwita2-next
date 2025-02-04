export interface Place {
  id: string;          // Mapbox place ID
  name: string;        // Place name from Mapbox
  description?: string;
  photos?: PlacePhoto[];
  coordinates: [number, number];
  updatedAt: string;
}

export interface PlacePhoto {
  url: string;
  caption?: string;
  createdAt: string;
}
