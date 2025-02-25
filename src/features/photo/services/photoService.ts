import { useAuth0 } from '@auth0/auth0-react';

export const usePhotoService = () => {
  const { getAccessTokenSilently } = useAuth0();
  const API_BASE = '/api/photos';

  const uploadPhoto = async (file: File) => {
    try {
      const token = await getAccessTokenSilently();
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload photo');
      }

      return response.json();
    } catch (error) {
      console.error('[photoService] Upload error:', error);
      throw error;
    }
  };

  const deletePhoto = async (url: string) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete photo');
      }

      return response.json();
    } catch (error) {
      console.error('[photoService] Delete error:', error);
      throw error;
    }
  };

  return {
    uploadPhoto,
    deletePhoto
  };
};
