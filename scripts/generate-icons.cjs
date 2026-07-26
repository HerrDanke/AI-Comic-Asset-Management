const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
const svgPath = path.join(iconsDir, 'svg-icon.svg');

if (!fs.existsSync(svgPath)) {
  console.error('SVG file not found:', svgPath);
  process.exit(1);
}

async function generatePNG(size, filename) {
  const outputPath = path.join(iconsDir, filename);
  await sharp(svgPath).resize(size, size).png().toFile(outputPath);
  console.log('[icons] Generated: ' + filename + ' (' + size + 'x' + size + ')');
}

async function main() {
  console.log('[icons] Starting icon generation...\n');
  
  await generatePNG(32, '32x32.png');
  await generatePNG(128, '128x128.png');
  await generatePNG(256, '128x128@2x.png');
  await generatePNG(512, 'icon.png');
  await generatePNG(1024, 'icon-1024.png');
  
  console.log('\n[icons] Done!');
}

main().catch(err => {
  console.error('[icons] Error:', err);
  process.exit(1);
});