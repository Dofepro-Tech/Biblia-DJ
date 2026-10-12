import sharp from 'sharp';
import fs from 'fs';

const svgPath = 'src/assets/biblia-ng-logo.svg';
const svgBuffer = fs.readFileSync(svgPath);

const conversions = [
  { name: 'biblia-ng-logo.png', size: 512 },
  { name: 'biblia-ng-logo-ui.png', size: 787 },
  { name: 'biblia-ng-logo-splash.png', size: 787 },
];

async function convertAll() {
  for (const { name, size } of conversions) {
    const outputPath = `src/assets/${name}`;
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Converted ${name} to PNG with transparency (${size}x${size})`);
  }
  console.log('All logos converted successfully!');
}

convertAll().catch(console.error);
