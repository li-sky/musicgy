#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 开始分析和优化构建文件...');

const openNextDir = path.join(process.cwd(), '.open-next');
const serverFunctionsDir = path.join(openNextDir, 'server-functions', 'default');

// 检查目录是否存在
if (!fs.existsSync(serverFunctionsDir)) {
  console.log('❌ 未找到 server-functions 目录，请先运行构建');
  process.exit(1);
}

// 查找大文件
function findLargeFiles(dir, maxSizeMB = 1) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile()) {
        const sizeMB = stat.size / (1024 * 1024);
        if (sizeMB >= maxSizeMB) {
          files.push({
            path: fullPath,
            size: sizeMB.toFixed(2) + ' MB',
            relativePath: fullPath.replace(process.cwd() + '/', '')
          });
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

// 分析 handler.mjs
const handlerPath = path.join(serverFunctionsDir, 'handler.mjs');
if (fs.existsSync(handlerPath)) {
  const stats = fs.statSync(handlerPath);
  const sizeMB = stats.size / (1024 * 1024);
  console.log(`📄 handler.mjs: ${sizeMB.toFixed(2)} MB`);
  
  if (sizeMB > 5) {
    console.log('⚠️  handler.mjs 文件过大，尝试优化...');
    
    // 读取内容并检查是否包含 resvg 或 @vercel/og
    const content = fs.readFileSync(handlerPath, 'utf8');
    const hasResvg = content.includes('resvg') || content.includes('resvg-wasm');
    const hasVercelOG = content.includes('@vercel/og') || content.includes('vercel/og');
    
    if (hasResvg || hasVercelOG) {
      console.log('❌ 发现 resvg 或 @vercel/og 依赖，需要进一步优化');
    } else {
      console.log('✅ 未发现 resvg 或 @vercel/og 依赖');
    }
  }
}

// 查找所有大文件
console.log('\n📁 查找所有大文件 (>= 1MB):');
const largeFiles = findLargeFiles(openNextDir, 1);
largeFiles.forEach(file => {
  console.log(`  ${file.size} - ${file.relativePath}`);
});

// 检查 node_modules 是否被错误打包
console.log('\n🔍 检查是否包含 node_modules:');
const handlerContent = fs.readFileSync(handlerPath, 'utf8');
const nodeModulesMatches = handlerContent.match(/node_modules/g);
if (nodeModulesMatches) {
  console.log(`⚠️  发现 ${nodeModulesMatches.length} 处 node_modules 引用`);
} else {
  console.log('✅ 未发现 node_modules 引用');
}

// 统计信息
const totalSize = largeFiles.reduce((sum, file) => {
  return sum + parseFloat(file.size);
}, 0);

console.log(`\n📊 总计: ${largeFiles.length} 个大文件，总大小: ${totalSize.toFixed(2)} MB`);

// 建议
console.log('\n💡 优化建议:');
console.log('1. 确保 next.config.js 中正确配置了 webpack externals');
console.log('2. 检查是否有未使用的依赖被错误打包');
console.log('3. 考虑使用 next/dynamic 懒加载大型组件');
console.log('4. 确认 @vercel/og 和 resvg-wasm 已被正确排除');

if (largeFiles.length > 0) {
  console.log('\n🔧 如需手动清理，可以运行:');
  console.log('  npm run clean:unused');
}
