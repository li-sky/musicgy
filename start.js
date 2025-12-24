#!/usr/bin/env bun

// Bun启动脚本 - 同时启动后端服务器和前端开发服务器
import { spawn } from 'bun';

console.log('🚀 Starting Musicgy Application with Bun...\n');

// 启动后端 Express 服务器
console.log('📦 Starting Backend Server (Express on port 3001)...');
const backend = Bun.spawn(['bun', 'server.ts'], {
  cwd: import.meta.dir,
  stdout: 'inherit',
  stderr: 'inherit'
});

// 等待1秒后启动前端
await new Promise(resolve => setTimeout(resolve, 1000));

console.log('\n🎨 Starting Frontend Server (Vite on port 3000)...');
const frontend = Bun.spawn(['bun', 'run', 'dev'], {
  cwd: import.meta.dir,
  stdout: 'inherit',
  stderr: 'inherit'
});

// 处理进程退出
const handleShutdown = () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// 等待进程结束
await Promise.all([
  backend.exited,
  frontend.exited
]);
