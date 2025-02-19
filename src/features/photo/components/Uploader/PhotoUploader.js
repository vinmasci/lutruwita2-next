import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import exifr from 'exifr';
import PhotoUploaderUI from './PhotoUploaderUI';
import { usePhotoService } from '../../services/photoService';
const PhotoUploader = ({ onUploadComplete, onDeletePhoto, onAddToMap }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState();
    const [photos, setPhotos] = useState([]);
    const [selectedPhotos, setSelectedPhotos] = useState(new Set());
    const photoService = usePhotoService();
    const handleFileAdd = async (files) => {
        if (files.length === 0)
            return;
        setIsLoading(true);
        setError(undefined);
        try {
            const processedPhotos = await Promise.all(files.map(async (file) => {
                if (!file.type.startsWith('image/')) {
                    throw new Error(`Invalid file type for ${file.name}`);
                }
                // Upload to S3 first
                const { url, thumbnailUrl } = await photoService.uploadPhoto(file);
                // Then extract GPS data
                const exif = await exifr.parse(file, { gps: true });
                const hasGps = Boolean(exif?.latitude && exif?.longitude);
                const photoId = `photo-${Date.now()}-${Math.random()}`;
                const photo = {
                    id: photoId,
                    name: file.name,
                    url,
                    thumbnailUrl,
                    dateAdded: new Date(),
                    hasGps,
                    ...(hasGps && {
                        coordinates: {
                            lat: exif.latitude,
                            lng: exif.longitude
                        },
                        altitude: exif.altitude
                    })
                };
                // Add to local state for preview
                setPhotos(prev => [...prev, photo]);
                // Auto-select the photo
                setSelectedPhotos(prev => {
                    const next = new Set(prev);
                    next.add(photoId);
                    return next;
                });
                return photo;
            }));
            setIsLoading(false);
        }
        catch (error) {
            console.error('[PhotoUploader] Error processing files:', error);
            setError({
                message: 'Failed to process photos',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            setIsLoading(false);
        }
    };
    const handlePhotoSelect = (photoId) => {
        setSelectedPhotos(prev => {
            const next = new Set(prev);
            if (next.has(photoId)) {
                next.delete(photoId);
            }
            else {
                next.add(photoId);
            }
            return next;
        });
    };
    const handleAddToMap = () => {
        // Get all photos that have GPS coordinates
        const photosToAdd = photos.filter(p => p.hasGps);
        if (photosToAdd.length > 0) {
            // Only call onUploadComplete when actually adding to map
            onUploadComplete(photosToAdd);
            if (onAddToMap) {
                onAddToMap(photosToAdd);
            }
            // Clear photos and selection after adding to map
            setPhotos([]);
            setSelectedPhotos(new Set());
        }
    };
    const handleFileDelete = async (photoId) => {
        try {
            const photo = photos.find(p => p.id === photoId);
            if (!photo)
                return;
            // Delete from S3 first
            await photoService.deletePhoto(photo.url);
            // Then update local state
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            setSelectedPhotos(prev => {
                const next = new Set(prev);
                next.delete(photoId);
                return next;
            });
            if (onDeletePhoto) {
                onDeletePhoto(photoId);
            }
        }
        catch (error) {
            console.error('[PhotoUploader] Delete error:', error);
            setError({
                message: 'Failed to delete photo',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
    const handleFileRename = (photoId, newName) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, name: newName } : p));
    };
    return (_jsx(PhotoUploaderUI, { isLoading: isLoading, error: error, photos: photos, selectedPhotos: selectedPhotos, onFileAdd: handleFileAdd, onFileDelete: handleFileDelete, onFileRename: handleFileRename, onPhotoSelect: handlePhotoSelect, onAddToMap: handleAddToMap }));
};
export default PhotoUploader;
