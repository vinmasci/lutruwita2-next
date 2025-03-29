const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Paths to the original images
const heroImagePath = path.join(__dirname, 'public', 'images', 'hero.png');
const contourImagePath = path.join(__dirname, 'public', 'images', 'contour.jpeg');

// Paths for the optimized images
const optimizedHeroWebP = path.join(__dirname, 'public', 'images', 'hero.webp');
const optimizedHeroJPG = path.join(__dirname, 'public', 'images', 'hero.jpg');
const optimizedContourWebP = path.join(__dirname, 'public', 'images', 'contour.webp');
const optimizedContourJPG = path.join(__dirname, 'public', 'images', 'contour.jpg');

// Create the images directory if it doesn't exist
const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Optimize the hero image
async function optimizeHeroImage() {
  try {
    console.log('Optimizing hero image...');
    
    // Create a WebP version (better compression, modern browsers)
    await sharp(heroImagePath)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(optimizedHeroWebP);
    
    // Create a JPG version (fallback for older browsers)
    await sharp(heroImagePath)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(optimizedHeroJPG);
    
    const originalSize = fs.statSync(heroImagePath).size / (1024 * 1024);
    const webpSize = fs.statSync(optimizedHeroWebP).size / (1024 * 1024);
    const jpgSize = fs.statSync(optimizedHeroJPG).size / (1024 * 1024);
    
    console.log(`Hero image optimization complete!`);
    console.log(`Original size: ${originalSize.toFixed(2)} MB`);
    console.log(`WebP size: ${webpSize.toFixed(2)} MB (${(webpSize / originalSize * 100).toFixed(2)}% of original)`);
    console.log(`JPG size: ${jpgSize.toFixed(2)} MB (${(jpgSize / originalSize * 100).toFixed(2)}% of original)`);
  } catch (error) {
    console.error('Error optimizing hero image:', error);
  }
}

// Optimize the contour image
async function optimizeContourImage() {
  try {
    console.log('\nOptimizing contour image...');
    
    // Create a WebP version
    await sharp(contourImagePath)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(optimizedContourWebP);
    
    // Create a JPG version
    await sharp(contourImagePath)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toFile(optimizedContourJPG);
    
    const originalSize = fs.statSync(contourImagePath).size / (1024 * 1024);
    const webpSize = fs.statSync(optimizedContourWebP).size / (1024 * 1024);
    const jpgSize = fs.statSync(optimizedContourJPG).size / (1024 * 1024);
    
    console.log(`Contour image optimization complete!`);
    console.log(`Original size: ${originalSize.toFixed(2)} MB`);
    console.log(`WebP size: ${webpSize.toFixed(2)} MB (${(webpSize / originalSize * 100).toFixed(2)}% of original)`);
    console.log(`JPG size: ${jpgSize.toFixed(2)} MB (${(jpgSize / originalSize * 100).toFixed(2)}% of original)`);
  } catch (error) {
    console.error('Error optimizing contour image:', error);
  }
}

// Run the optimization
async function optimizeImages() {
  await optimizeHeroImage();
  await optimizeContourImage();
  console.log('\nImage optimization complete!');
  console.log('To use the optimized images, update your code to use the WebP format with JPG fallback.');
}

optimizeImages();
