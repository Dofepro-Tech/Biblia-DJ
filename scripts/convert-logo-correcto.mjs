import sharp from 'sharp';
import fs from 'fs';

const sourcePath = 'src/assets/biblia-ng-logo-splash.jpeg';
const conversions = [
  { path: 'src/assets/biblia-ng-logo.png', size: 1024 },
  { path: 'src/assets/biblia-ng-logo-ui.png', size: 1024 },
  { path: 'src/assets/biblia-ng-logo-splash.png', size: 1024 },
  { path: 'public/favicon.png', size: 512 },
];

async function convertLogo() {
  // Cargar el logo JPEG
  const sourceBuffer = fs.readFileSync(sourcePath);

  for (const { path, size } of conversions) {
    await sharp(sourceBuffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .png({
        quality: 100,
        compressionLevel: 6,
        adaptiveFiltering: true,
      })
      .toFile(path);
    console.log(`Converted ${path} (${size}x${size}) with high quality`);
  }

  console.log('All logos converted successfully!');
}

convertLogo().catch(console.error);
