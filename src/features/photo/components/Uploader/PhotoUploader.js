import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import exifr from 'exifr';
import PhotoUploaderUI from './PhotoUploaderUI';
import { usePhotoService } from '../../services/photoService';

// Upload status constants
const UPLOAD_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading',
    SUCCESS: 'success',
    ERROR: 'error'
};

// Delay after S3 upload to ensure image is available (in ms)
const S3_PROCESSING_DELAY = 2000;

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
            // Process files in parallel
            await Promise.all(files.map(async (file) => {
                if (!file.type.startsWith('image/')) {
                    throw new Error(`Invalid file type for ${file.name}`);
                }
                
                // Create a unique ID for this photo
                const photoId = `photo-${Date.now()}-${Math.random()}`;
                
                // Extract GPS data
                const exif = await exifr.parse(file, { gps: true });
                const hasGps = Boolean(exif?.latitude && exif?.longitude);
                
                // Resize the image to multiple sizes
                const resizedImages = await photoService.resizeImageToMultipleSizes(file);
                
                // Add to local state with pending status and resized images
                const initialPhoto = {
                    id: photoId,
                    name: file.name,
                    // Store all the resized image URLs
                    tinyThumbnailUrl: resizedImages.tiny,
                    thumbnailUrl: resizedImages.thumbnail,
                    mediumUrl: resizedImages.medium,
                    url: resizedImages.large, // Use large as the main URL
                    // Store the blobs for later cleanup and upload
                    _blobs: {
                        tiny: resizedImages.tinyBlob,
                        thumbnail: resizedImages.thumbnailBlob,
                        medium: resizedImages.mediumBlob,
                        large: resizedImages.largeBlob
                    },
                    uploadStatus: UPLOAD_STATUS.SUCCESS, // Not uploading yet
                    dateAdded: new Date(),
                    hasGps,
                    ...(hasGps && {
                        coordinates: {
                            lat: exif.latitude,
                            lng: exif.longitude
                        },
                        altitude: exif.altitude
                    }),
                    // Flag to indicate this is a local image, not yet uploaded to Cloudinary
                    isLocal: true
                };
                
                // Update state with the initial photo
                setPhotos(prev => [...prev, initialPhoto]);
                
                // Auto-select the photo
                setSelectedPhotos(prev => {
                    const next = new Set(prev);
                    next.add(photoId);
                    return next;
                });
            }));
            
            setIsLoading(false);
        } catch (error) {
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
            } else {
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
            if (!photo) return;
            
            // Clean up blob URLs to prevent memory leaks
            if (photo._blobs) {
                // Revoke any blob URLs
                photoService.revokeBlobUrls({
                    tiny: photo.tinyThumbnailUrl,
                    thumbnail: photo.thumbnailUrl,
                    medium: photo.mediumUrl,
                    large: photo.url
                });
            }
            
            // Only try to delete from Cloudinary if it was uploaded
            if (!photo.isLocal && photo.uploadStatus === UPLOAD_STATUS.SUCCESS && photo.publicId) {
                await photoService.deletePhoto(null, photo.publicId);
            }
            
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
        } catch (error) {
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

    return (
        _jsx(PhotoUploaderUI, { 
            isLoading: isLoading, 
            error: error, 
            photos: photos, 
            selectedPhotos: selectedPhotos, 
            onFileAdd: handleFileAdd, 
            onFileDelete: handleFileDelete, 
            onFileRename: handleFileRename, 
            onPhotoSelect: handlePhotoSelect, 
            onAddToMap: handleAddToMap 
        })
    );
};

export default PhotoUploader;
