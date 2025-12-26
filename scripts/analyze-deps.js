#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 分析依赖关系，查找 resvg 和 @vercel/og 的来源...\n');

// 检查 package.json 中的直接依赖
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('📦 直接依赖:');
Object.keys(packageJson.dependencies).forEach(dep => {
  if (dep.includes('vercel') || dep.includes('og') || dep.includes('resvg')) {
    console.log(`  ⚠️  ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`  ✅ ${dep}`);
  }
});

// 检查 next.js 的依赖
console.log('\n📦 Next.js 依赖分析:');
const nextPath = path.join(process.cwd(), 'node_modules', 'next');
if (fs.existsSync(nextPath)) {
  const nextPackageJson = JSON.parse(fs.readFileSync(path.join(nextPath, 'package.json'), 'utf8'));
  const nextDeps = nextPackageJson.dependencies || {};
  
  Object.keys(nextDeps).forEach(dep => {
    if (dep.includes('vercel') || dep.includes('og') || dep.includes('resvg')) {
      console.log(`  ⚠️  Next.js 依赖 ${dep}: ${nextDeps[dep]}`);
    }
  });
}

// 检查 @opennextjs/cloudflare 的依赖
console.log('\n📦 @opennextjs/cloudflare 依赖分析:');
const openNextPath = path.join(process.cwd(), 'node_modules', '@opennextjs', 'cloudflare');
if (fs.existsSync(openNextPath)) {
  const openNextPackageJson = JSON.parse(fs.readFileSync(path.join(openNextPath, 'package.json'), 'utf8'));
  const openNextDeps = openNextPackageJson.dependencies || {};
  
  Object.keys(openNextDeps).forEach(dep => {
    if (dep.includes('vercel') || dep.includes('og') || dep.includes('resvg')) {
      console.log(`  ⚠️  @opennextjs/cloudflare 依赖 ${dep}: ${openNextDeps[dep]}`);
    }
  });
}

// 搜索整个 node_modules 中的 resvg 和 @vercel/og
console.log('\n🔍 搜索 node_modules 中的相关包:');
const nodeModulesPath = path.join(process.cwd(), 'node_modules');

function findPackage(dir, packageName) {
  const results = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          if (item === packageName || (item.startsWith('@') && fullPath.includes(packageName))) {
            results.push(fullPath);
          } else if (!item.startsWith('.') && !item.startsWith('node_modules')) {
            traverse(fullPath);
          }
        }
      }
    } catch (e) {
      // 忽略权限错误
    }
  }
  
  traverse(dir);
  return results;
}

const resvgPaths = findPackage(nodeModulesPath, 'resvg');
const vercelOGPaths = findPackage(nodeModulesPath, '@vercel/og');

if (resvgPaths.length > 0) {
  console.log('📦 找到 resvg 相关包:');
  resvgPaths.forEach(p => {
    const relPath = p.replace(nodeModulesPath + '/', '');
    console.log(`  ⚠️  ${relPath}`);
  });
} else {
  console.log('✅ 未找到 resvg 相关包');
}

if (vercelOGPaths.length > 0) {
  console.log('📦 找到 @vercel/og 相关包:');
  vercelOGPaths.forEach(p => {
    const relPath = p.replace(nodeModulesPath + '/', '');
    console.log(`  ⚠️  ${relPath}`);
  });
} else {
  console.log('✅ 未找到 @vercel/og 相关包');
}

// 检查是否有间接依赖
console.log('\n🔗 检查间接依赖 (peerDependencies):');
const allPackages = [...resvgPaths, ...vercelOGPaths];
if (allPackages.length > 0) {
  allPackages.forEach(pkgPath => {
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkgJson.peerDependencies) {
        console.log(`  ${pkgJson.name} 需要:`);
        Object.keys(pkgJson.peerDependencies).forEach(dep => {
          console.log(`    - ${dep}: ${pkgJson.peerDependencies[dep]}`);
        });
      }
    }
  });
}

console.log('\n💡 分析完成！');
console.log('如果发现 resvg 或 @vercel/og，它们可能是作为 peerDependencies 被引入的。');
