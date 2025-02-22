import { ProcessedPhoto } from '../components/Uploader/PhotoUploader.types';

export const serializePhoto = (photo: ProcessedPhoto) => {
  return {
    id: photo.id,
    name: photo.name,
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    dateAdded: photo.dateAdded,
    hasGps: photo.hasGps,
    coordinates: photo.coordinates,
    rotation: photo.rotation,
    altitude: photo.altitude
  };
};

export const deserializePhoto = (photo: any): ProcessedPhoto => {
  return {
    id: photo.id,
    name: photo.name,
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    dateAdded: new Date(photo.dateAdded),
    hasGps: photo.hasGps || false,
    coordinates: photo.coordinates,
    rotation: photo.rotation,
    altitude: photo.altitude
  };
};

export const createProcessedPhoto = (file: File): ProcessedPhoto => {
  const blobUrl = URL.createObjectURL(file);
  return {
    id: Math.random().toString(),
    name: file.name,
    url: blobUrl,
    thumbnailUrl: blobUrl,
    dateAdded: new Date(),
    hasGps: false
  };
};

export const fileToProcessedPhoto = (file: File): ProcessedPhoto => {
  return createProcessedPhoto(file);
};

// Note: This function is deprecated as we now store the original File object
// directly in the component state for upload
export const processedPhotoToFile = (photo: ProcessedPhoto): File => {
  throw new Error('processedPhotoToFile is deprecated. Store the original File object instead.');
};
