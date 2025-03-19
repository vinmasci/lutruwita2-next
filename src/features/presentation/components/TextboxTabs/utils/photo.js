const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const JPEG_QUALITY = 0.7;

export const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            // Calculate new dimensions while maintaining aspect ratio
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
            }
            else {
                if (height > MAX_HEIGHT) {
                    width = Math.round((width * MAX_HEIGHT) / height);
                    height = MAX_HEIGHT;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                }
                else {
                    reject(new Error('Could not create blob'));
                }
            }, 'image/jpeg', JPEG_QUALITY);
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };
    });
};

export const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

export const createTextboxTabPhoto = async (file) => {
    // First resize the image
    const resizedBlob = await resizeImage(file);
    // Then convert to base64
    const url = await convertFileToBase64(new File([resizedBlob], file.name, { type: 'image/jpeg' }));
    return {
        url,
        caption: file.name
    };
};

export const createTextboxTabPhotos = async (files) => {
    return Promise.all(files.map(file => createTextboxTabPhoto(file)));
};
