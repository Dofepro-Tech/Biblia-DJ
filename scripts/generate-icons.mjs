import sharp from 'sharp';
import fs from 'fs';

const svgPath = 'src/assets/biblia-ng-logo.svg';
const sizes = [
  { size: 48, path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png' },
  { size: 72, path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png' },
  { size: 96, path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png' },
  { size: 144, path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png' },
  { size: 192, path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' },
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const { size, path } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path);
    console.log(`Generated ${size}x${size} icon at ${path}`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
