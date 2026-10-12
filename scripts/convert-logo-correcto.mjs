import sharp from 'sharp';
import fs from 'fs';

const sourcePath = 'src/assets/biblia-ng-logo-splash.jpeg';
const conversions = [
  { path: 'src/assets/biblia-ng-logo.png', size: 512 },
  { path: 'src/assets/biblia-ng-logo-ui.png', size: 787 },
  { path: 'src/assets/biblia-ng-logo-splash.png', size: 787 },
  { path: 'public/favicon.png', size: 512 },
];

async function convertLogo() {
  // Cargar el logo JPEG
  const sourceBuffer = fs.readFileSync(sourcePath);

  for (const { path, size } of conversions) {
    const radius = Math.floor(size / 8); // Radio de esquina redondeada
    await sharp(sourceBuffer)
      .resize(size, size)
      .png()
      .toFile(path);
    console.log(`Converted ${path} (${size}x${size})`);
  }

  console.log('All logos converted successfully!');
}

convertLogo().catch(console.error);
