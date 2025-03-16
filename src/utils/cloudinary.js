import axios from 'axios';

export async function uploadToCloudinary(file) {
  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'map_logos'); // Create this preset in Cloudinary dashboard
  
  try {
    // Upload to Cloudinary
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );
    
    // Return the secure URL of the uploaded image
    return response.data.secure_url;
  } catch (error) {
    console.error('Error uploading logo to Cloudinary:', error);
    throw error;
  }
}
