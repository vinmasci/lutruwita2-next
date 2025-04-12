const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Generate a simple colored square with text for each icon
async function generateIcon(filename, size, text, bgColor = '#4285F4') {
  const svgBuffer = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${bgColor}" />
      <text x="50%" y="50%" font-family="Arial" font-size="${size/4}" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
  `);

  await sharp(svgBuffer)
    .png()
    .toFile(path.join(assetsDir, filename));
  
  console.log(`Generated ${filename}`);
}

// Generate app icons
async function generateIcons() {
  // App icon (1024x1024)
  await generateIcon('icon.png', 1024, 'L', '#3F51B5');
  
  // Splash screen (2048x2048)
  await generateIcon('splash.png', 2048, 'Lutruwita', '#3F51B5');
  
  // Adaptive icon foreground (1024x1024)
  await generateIcon('adaptive-icon.png', 1024, 'L', '#3F51B5');
  
  // Favicon (64x64)
  await generateIcon('favicon.png', 64, 'L', '#3F51B5');
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
