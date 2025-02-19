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
  return {
    id: Math.random().toString(),
    name: file.name,
    url: URL.createObjectURL(file),
    thumbnailUrl: URL.createObjectURL(file),
    dateAdded: new Date(),
    hasGps: false
  };
};

export const fileToProcessedPhoto = (file: File): ProcessedPhoto => {
  return createProcessedPhoto(file);
};

export const processedPhotoToFile = (photo: ProcessedPhoto): File => {
  return new File([], photo.name, { type: 'image/jpeg' });
};
