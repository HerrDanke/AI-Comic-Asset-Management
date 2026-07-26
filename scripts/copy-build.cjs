<longcat_arg_value>const fs = require('fs');
const path = require('path');

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 构建产物源目录
const bundleDir = path.join(projectRoot, 'src-tauri', 'target', 'release', 'bundle');

// 目标目录（项目根目录下的 dist-installer 文件夹）
const destDir = path.join(projectRoot, 'dist-installer');

// 确保目标目录存在
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`[copy-build] 创建目标目录: ${destDir}`);
}

// 复制文件的函数
function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`[copy-build] 已复制: ${path.basename(dest)}`);
    return true;
  } catch (err) {
    console.error(`[copy-build] 复制失败: ${err.message}`);
    return false;
  }
}

// 查找并复制安装包
function findAndCopyInstallers() {
  let copied = [];

  // 递归查找所有 .exe 和 .msi 文件
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.exe') || entry.name.endsWith('.msi')) {
        const destPath = path.join(destDir, entry.name);
        if (copyFile(fullPath, destPath)) {
          copied.push(entry.name);
        }
      }
    }
  }

  scanDir(bundleDir);

  if (copied.length > 0) {
    console.log(`\n[copy-build] 成功复制 ${copied.length} 个安装包到: ${destDir}`);
    console.log('[copy-build] 文件列表:');
    copied.forEach(f => console.log(`  - ${f}`));
  } else {
    console.log('[copy-build] 未找到安装包，请检查构建是否成功');
  }
}

// 执行复制
console.log('[copy-build] 开始复制安装包...');
console.log(`[copy-build] 源目录: ${bundleDir}`);
console.log(`[copy-build] 目标目录: ${destDir}\n`);
findAndCopyInstallers();
