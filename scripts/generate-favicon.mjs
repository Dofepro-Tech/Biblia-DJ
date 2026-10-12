import sharp from 'sharp';
import fs from 'fs';

const svgPath = 'src/assets/biblia-ng-logo.svg';
const faviconPath = 'public/favicon.png';

async function generateFavicon() {
  const svgBuffer = fs.readFileSync(svgPath);

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(faviconPath);

  console.log('Favicon generated with transparency');
}

generateFavicon().catch(console.error);
