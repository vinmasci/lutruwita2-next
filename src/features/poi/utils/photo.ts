export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const createPOIPhoto = async (file: File) => {
  const url = await convertFileToBase64(file);
  return {
    url,
    caption: file.name,
    createdAt: new Date().toISOString()
  };
};

export const createPOIPhotos = async (files: File[]) => {
  return Promise.all(files.map(file => createPOIPhoto(file)));
};
