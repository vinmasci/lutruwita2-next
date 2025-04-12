import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import exifr from 'exifr';
import PhotoUploaderUI from './PhotoUploaderUI';
import { usePhotoService } from '../../services/photoService';
import { useMapContext } from '../../../map/context/MapContext';

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
    const { map } = useMapContext();

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
        const photosToAdd = photos.filter(p => p.hasGps && !p.isManuallyPlaced);
        
        if (photosToAdd.length > 0) {
            // Only call onUploadComplete when actually adding to map
            onUploadComplete(photosToAdd);
            
            if (onAddToMap) {
                onAddToMap(photosToAdd);
            }
            
            // Only remove the photos that were added to the map
            const photoIdsToRemove = new Set(photosToAdd.map(p => p.id));
            setPhotos(prev => prev.filter(p => !photoIdsToRemove.has(p.id)));
            
            // Update selected photos
            setSelectedPhotos(prev => {
                const next = new Set(prev);
                photosToAdd.forEach(p => next.delete(p.id));
                return next;
            });
            
            console.log('[PhotoUploader] Added GPS photos to map:', photosToAdd.length);
        }
    };
    
    // Function to add photos without GPS data as draggable markers
    const handleAddAsDraggable = () => {
        // Get all photos that don't have GPS coordinates
        const photosWithoutGps = photos.filter(p => !p.hasGps);
        
        if (photosWithoutGps.length > 0) {
            // Get the center of the map as the default position
            const center = map ? map.getCenter() : { lng: 0, lat: 0 };
            
            // Add isManuallyPlaced flag and default coordinates to each photo
            const draggablePhotos = photosWithoutGps.map((photo, index) => {
                // Spread photos slightly around the center to avoid stacking
                const offset = 0.001 * (index + 1); // Small offset based on index
                const angle = (index * Math.PI * 2) / photosWithoutGps.length; // Distribute in a circle
                
                return {
                    ...photo,
                    isManuallyPlaced: true, // Mark as manually placed
                    hasGps: true, // Now it has coordinates (even though they're manually set)
                    coordinates: {
                        lng: center.lng + offset * Math.cos(angle),
                        lat: center.lat + offset * Math.sin(angle)
                    }
                };
            });
            
            console.log('[PhotoUploader] Adding photos as draggable markers:', draggablePhotos.length);
            
            // Add the photos to the map
            onUploadComplete(draggablePhotos);
            
            if (onAddToMap) {
                onAddToMap(draggablePhotos);
            }
            
            // Only remove the photos that were added to the map
            const photoIdsToRemove = new Set(photosWithoutGps.map(p => p.id));
            setPhotos(prev => prev.filter(p => !photoIdsToRemove.has(p.id)));
            
            // Update selected photos
            setSelectedPhotos(prev => {
                const next = new Set(prev);
                photosWithoutGps.forEach(p => next.delete(p.id));
                return next;
            });
        }
    };

    // Handle photo deletion from the sidebar
    const handleFileDelete = async (photoId, isBeingPlacedOnMap = false) => {
        try {
            const photo = photos.find(p => p.id === photoId);
            if (!photo) return;
            
            // Only clean up blob URLs if the photo is being deleted, not if it's being placed on the map
            if (!isBeingPlacedOnMap && photo._blobs) {
                // Revoke any blob URLs
                photoService.revokeBlobUrls({
                    tiny: photo.tinyThumbnailUrl,
                    thumbnail: photo.thumbnailUrl,
                    medium: photo.mediumUrl,
                    large: photo.url
                });
            }
            
            // Only try to delete from Cloudinary if it was uploaded and not being placed on the map
            if (!isBeingPlacedOnMap && !photo.isLocal && photo.uploadStatus === UPLOAD_STATUS.SUCCESS && photo.publicId) {
                await photoService.deletePhoto(null, photo.publicId);
            }
            
            // Then update local state
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            setSelectedPhotos(prev => {
                const next = new Set(prev);
                next.delete(photoId);
                return next;
            });
            
            if (onDeletePhoto && !isBeingPlacedOnMap) {
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
    
    // Handle photo drag from the sidebar to the map
    // This function is called when a photo is placed on the map
    useEffect(() => {
        // Set up a global event listener for custom events
        const handlePhotoPlaced = (event) => {
            if (event.detail && event.detail.photoId) {
                console.log('[PhotoUploader] Photo placed on map:', event.detail.photoId);
                // Remove the photo from the sidebar, but don't revoke blob URLs
                handleFileDelete(event.detail.photoId, true);
            }
        };
        
        // Add event listeners for both drop and place events
        window.addEventListener('photo-dropped-on-map', handlePhotoPlaced);
        window.addEventListener('photo-placed-on-map', handlePhotoPlaced);
        
        // Clean up
        return () => {
            window.removeEventListener('photo-dropped-on-map', handlePhotoPlaced);
            window.removeEventListener('photo-placed-on-map', handlePhotoPlaced);
        };
    }, [photos]);

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
            onAddToMap: handleAddToMap,
            onAddAsDraggable: handleAddAsDraggable
        })
    );
};

export default PhotoUploader;
