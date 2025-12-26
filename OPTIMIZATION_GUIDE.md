# 文件大小优化指南

## 问题分析

你的项目遇到了两个主要的文件大小问题：

1. **handler.mjs** - 11.4 MB (过大)
2. **resvg.wasm** - 1.3 MB (不需要)

## 解决方案

### 1. 已实施的优化措施

#### next.config.js 优化
- 配置 webpack 排除 `@vercel/og` 和 `resvg-wasm`
- 使用 mock 文件替换这些模块
- 添加代码分割优化

#### package.json 优化
- 添加了新的构建脚本：
  - `build:optimized` - 完整优化流程
  - `build:analyze` - 分析 + 优化
  - `analyze-deps` - 依赖分析
  - `analyze` - 构建后分析

#### 构建脚本
- `scripts/pre-build.js` - 预构建，创建 mock 文件
- `scripts/optimize-build.js` - 构建后分析和清理
- `scripts/analyze-deps.js` - 依赖关系分析

### 2. 如何使用优化

#### 选项 A：快速优化（推荐）
```bash
npm run build:optimized
```

#### 选项 B：完整分析 + 优化
```bash
npm run build:analyze
```

#### 选项 C：分步执行
```bash
# 1. 清理
npm run clean

# 2. 分析依赖
npm run analyze-deps

# 3. 预构建优化
node scripts/pre-build.js

# 4. 构建
next build

# 5. 分析结果
npm run analyze

# 6. 清理无用文件
npm run clean:unused
```

### 3. 预期效果

通过这些优化，你应该看到：

- ✅ `resvg.wasm` 被完全排除
- ✅ `@vercel/og` 相关代码被移除
- ✅ handler.mjs 体积显著减小
- ✅ 构建时间可能略有增加（因为额外的处理步骤）

### 4. 手动验证

构建完成后，运行：
```bash
npm run analyze
```

这会显示：
- 所有大于 1MB 的文件
- 是否仍包含 resvg 或 @vercel/og
- 构建后的总大小统计

### 5. 如果仍有问题

如果优化后仍有大文件，可以：

1. **检查分析输出**：运行 `npm run analyze-deps` 查看依赖来源
2. **检查构建日志**：查看是否有警告信息
3. **手动清理**：删除 `.open-next` 目录后重试
4. **检查 Next.js 版本**：确保使用的是最新稳定版

### 6. 长期维护

建议：
- 定期运行 `npm run analyze` 监控文件大小
- 在 CI/CD 中添加大小检查
- 考虑使用 `next/bundle-analyzer` 进行更深入的分析

## 技术细节

### webpack 配置
- 使用 `resolve.alias` 替换模块
- 使用 `NormalModuleReplacementPlugin` 进行运行时替换
- 配置 `splitChunks` 进行代码分割

### Mock 系统
- 创建空的 mock 模块替换 resvg 和 @vercel/og
- 在构建时自动创建和使用
- 构建后自动清理

## 总结

这套优化方案通过多种方式确保不必要的模块被排除：
1. **预防**：预构建时创建 mock
2. **排除**：webpack 配置中声明 externals
3. **替换**：使用 NormalModuleReplacementPlugin
4. **清理**：构建后移除 map 文件和缓存

这应该能显著减少你的构建文件大小，特别是解决 resvg.wasm 和 @vercel/og 的问题。
