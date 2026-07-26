const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');

async function generateICO() {
  console.log('[ico] Generating ICO file...');
  
  // 读取多个尺寸的 PNG
  const sizes = [16, 32, 48, 64, 128, 256];
  const buffers = [];
  
  for (const size of sizes) {
    const filename = size + 'x' + size + '.png';
    const filePath = path.join(iconsDir, filename);
    
    if (fs.existsSync(filePath)) {
      buffers.push(fs.readFileSync(filePath));
      console.log('[ico] Added: ' + filename);
    } else {
      // 如果不存在，使用 icon.png 缩放
      const iconPath = path.join(iconsDir, 'icon.png');
      const sharp = require('sharp');
      const resized = await sharp(iconPath).resize(size, size).png().toBuffer();
      buffers.push(resized);
      console.log('[ico] Generated and added: ' + filename);
    }
  }
  
  // 生成 ICO
  const icoBuffer = await toIco(buffers);
  const icoPath = path.join(iconsDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('[ico] ICO file generated: ' + icoPath);
}

generateICO().catch(err => {
  console.error('[ico] Error:', err);
  process.exit(1);
});