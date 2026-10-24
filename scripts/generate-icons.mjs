import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const src = path.resolve('public/image.png');
  const iconsDir = path.resolve('public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Logo crop bounds
  // minX: 204, maxX: 1056 (width: 852), minY: 375, maxY: 915 (height: 540)
  const croppedLogoBuffer = await sharp(src)
    .extract({ left: 204, top: 375, width: 852, height: 540 })
    .toBuffer();

  // Create standard square app icon on clean white background
  // Standard icon: logo scaled to max 760 wide, max 760 high
  const standardMark = await sharp(croppedLogoBuffer)
    .resize(760, 760, { fit: 'inside' })
    .toBuffer();

  const base1024 = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: standardMark, gravity: 'center' }])
  .png()
  .toBuffer();

  // Save 512x512 standard
  await sharp(base1024)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));

  // Save 192x192 standard
  await sharp(base1024)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));

  // Save 384x384 standard
  await sharp(base1024)
    .resize(384, 384)
    .png()
    .toFile(path.join(iconsDir, 'icon-384.png'));

  // Save apple-touch-icon (180x180)
  await sharp(base1024)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  
  // Also save apple-touch-icon directly in public root for iOS standard crawl
  await sharp(base1024)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));

  // Maskable icon: safe area requires ~60% of canvas dimension to be safe from aggressive circular cropping
  const maskableMark = await sharp(croppedLogoBuffer)
    .resize(580, 580, { fit: 'inside' })
    .toBuffer();

  const maskable1024 = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: maskableMark, gravity: 'center' }])
  .png()
  .toBuffer();

  await sharp(maskable1024)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));

  await sharp(maskable1024)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-192.png'));

  // Favicons
  await sharp(base1024)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon-32x32.png'));

  await sharp(base1024)
    .resize(16, 16)
    .png()
    .toFile(path.join(iconsDir, 'favicon-16x16.png'));

  // Root favicon
  await sharp(base1024)
    .resize(48, 48)
    .png()
    .toFile(path.resolve('public/favicon.ico'));

  console.log('Successfully generated all PWA icons!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
