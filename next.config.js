/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: [
    '@neteasecloudmusicapienhanced/api',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 检查 mock 目录是否存在
      const mockDir = path.join(process.cwd(), 'scripts', 'mock');
      const hasMocks = fs.existsSync(mockDir);
      
      if (hasMocks) {
        // 使用 mock 文件替换 resvg 和 @vercel/og
        config.resolve.alias = {
          ...config.resolve.alias,
          '@vercel/og': path.join(mockDir, 'vercel-og.js'),
          'resvg-wasm': path.join(mockDir, 'resvg-wasm.js'),
          'resvg': path.join(mockDir, 'resvg-wasm.js'),
        };
      } else {
        // 如果没有 mock，直接排除
        config.resolve.alias = {
          ...config.resolve.alias,
          '@vercel/og': false,
          'resvg-wasm': false,
          'resvg': false,
        };
      }
      
      // 使用 NormalModuleReplacementPlugin 替换这些模块
      const { NormalModuleReplacementPlugin } = require('webpack');
      config.plugins.push(
        new NormalModuleReplacementPlugin(/@vercel\/og/, (resource) => {
          if (hasMocks) {
            resource.request = path.join(mockDir, 'vercel-og.js');
          }
        }),
        new NormalModuleReplacementPlugin(/resvg-wasm/, (resource) => {
          if (hasMocks) {
            resource.request = path.join(mockDir, 'resvg-wasm.js');
          }
        }),
        new NormalModuleReplacementPlugin(/resvg/, (resource) => {
          if (hasMocks) {
            resource.request = path.join(mockDir, 'resvg-wasm.js');
          }
        })
      );
      
      // 额外的优化：排除其他可能的大模块
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'async',
          minSize: 20000,
          maxSize: 250000,
        },
      };
    }
    return config;
  },
}

export default nextConfig
