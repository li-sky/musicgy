#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 预构建优化：准备排除 resvg 和 @vercel/og...');

// 检查 node_modules 中是否有这些包
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const packagesToCheck = [
  '@vercel/og',
  'resvg-wasm',
  'resvg'
];

function checkPackageExists(pkgName) {
  try {
    const pkgPath = path.join(nodeModulesPath, pkgName);
    return fs.existsSync(pkgPath);
  } catch (e) {
    return false;
  }
}

packagesToCheck.forEach(pkg => {
  if (checkPackageExists(pkg)) {
    console.log(`⚠️  发现 ${pkg}，将在构建时排除`);
  } else {
    console.log(`✅ ${pkg} 未安装，无需处理`);
  }
});

// 创建一个 mock 模块来替换 resvg
const mockDir = path.join(process.cwd(), 'scripts', 'mock');
if (!fs.existsSync(mockDir)) {
  fs.mkdirSync(mockDir, { recursive: true });
}

// 创建空的 resvg-wasm mock
const resvgMockPath = path.join(mockDir, 'resvg-wasm.js');
fs.writeFileSync(resvgMockPath, `
// Mock resvg-wasm - excluded from build
module.exports = {
  Resvg: class Resvg {
    constructor() {
      throw new Error('resvg-wasm is excluded from build');
    }
  }
};
`);

console.log('✅ 已创建 resvg-wasm mock');

// 创建空的 @vercel/og mock
const vercelOGMockPath = path.join(mockDir, 'vercel-og.js');
fs.writeFileSync(vercelOGMockPath, `
// Mock @vercel/og - excluded from build
module.exports = {
  ImageResponse: class ImageResponse {
    constructor() {
      throw new Error('@vercel/og is excluded from build');
    }
  }
};
`);

console.log('✅ 已创建 @vercel/og mock');

console.log('\n💡 预构建优化完成！');
console.log('   下一步将运行 next build，这些包会被排除');
