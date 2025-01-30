import React from 'react';
import { 
  TextField, 
  Button, 
  IconButton, 
  Typography,
  InputAdornment
} from '@mui/material';
import { Upload, X, Image } from 'lucide-react';
import { POIDetailsFormProps } from './types';
import { 
  StyledForm, 
  PhotoPreviewGrid, 
  PhotoPreview, 
  DeletePhotoButton 
} from './POIDrawer.styles';

const POIDetailsForm: React.FC<POIDetailsFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onBack,
  isSubmitting
}) => {
  const [name, setName] = React.useState(initialData?.name || '');
  const [description, setDescription] = React.useState(initialData?.description || '');
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      photos,
      category: initialData!.category,
      icon: initialData!.icon
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newPhotos]);
      
      // Create URLs for previews
      const newUrls = newPhotos.map(photo => URL.createObjectURL(photo));
      setPhotoUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handlePhotoDelete = (index: number) => {
    URL.revokeObjectURL(photoUrls[index]); // Clean up URL
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Clean up URLs on unmount
  React.useEffect(() => {
    return () => {
      photoUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <>
      <Typography variant="h6" gutterBottom>
        POI Details
      </Typography>

      <StyledForm onSubmit={handleSubmit}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          variant="filled"
          size="small"
        />

        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
          fullWidth
          variant="filled"
          size="small"
        />

        <div>
          <Typography variant="subtitle2" gutterBottom>
            Photos
          </Typography>
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
          />

          <Button
            variant="outlined"
            startIcon={<Upload size={16} />}
            onClick={() => fileInputRef.current?.click()}
            fullWidth
            sx={{ mb: 1 }}
          >
            Upload Photos
          </Button>

          {photoUrls.length > 0 && (
            <PhotoPreviewGrid>
              {photoUrls.map((url, index) => (
                <PhotoPreview key={url}>
                  <img src={url} alt={`Preview ${index + 1}`} />
                  <DeletePhotoButton
                    size="small"
                    onClick={() => handlePhotoDelete(index)}
                  >
                    <X size={16} />
                  </DeletePhotoButton>
                </PhotoPreview>
              ))}
            </PhotoPreviewGrid>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
          <Button
            variant="text"
            color="inherit"
            onClick={onBack}
            fullWidth
          >
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!name || isSubmitting}
            fullWidth
          >
            {isSubmitting ? 'Creating...' : 'Create POI'}
          </Button>
        </div>
      </StyledForm>
    </>
  );
};

export default POIDetailsForm;
