import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateExactIcons() {
  const src = path.resolve('public/image.png');
  const iconsDir = path.resolve('public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Use EXACT public/image.png without any cropping or modifications
  const sizes = [
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-384.png', size: 384 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-maskable-512.png', size: 512 },
    { name: 'icon-maskable-192.png', size: 192 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 }
  ];

  for (const { name, size } of sizes) {
    await sharp(src)
      .resize(size, size, { fit: 'fill' })
      .png()
      .toFile(path.join(iconsDir, name));
  }

  // Public root apple-touch-icon
  await sharp(src)
    .resize(180, 180, { fit: 'fill' })
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));

  // Public root favicon.ico
  await sharp(src)
    .resize(48, 48, { fit: 'fill' })
    .png()
    .toFile(path.resolve('public/favicon.ico'));

  console.log('Successfully generated all PWA icons using exact public/image.png!');
}

generateExactIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
