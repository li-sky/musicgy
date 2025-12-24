# Musicgy - 音乐协作播放平台

一个基于React + Express的实时音乐协作播放平台，支持网易云音乐搜索和播放。

## 项目架构

- **前端**: React + TypeScript + Vite (端口: 3000)
- **后端**: Express.js + TypeScript (端口: 3001)
- **音乐服务**: 网易云音乐API
- **包管理器**: Bun

## 快速开始

### 1. 安装依赖
```bash
bun install
```

### 2. 启动项目

#### 方式一：分别启动前后端（推荐开发用）
```bash
# 终端1 - 启动后端
bun server.ts

# 终端2 - 启动前端
bun run dev
```

#### 方式二：一键启动（使用Bun脚本）
```bash
bun start
```

#### 方式三：使用package.json脚本
```bash
# 同时启动前后端
bun run dev:all
```

### 3. 访问应用
- 前端: http://localhost:3000
- 后端API: http://localhost:3001

## API端点

### 前端调用的API (`api.ts`)
- `GET  /api/state` - 获取房间状态
- `POST /api/queue` - 添加歌曲到队列
- `POST /api/vote-skip` - 投票跳过歌曲
- `GET  /api/search?q=...` - 搜索歌曲
- `GET  /api/stream?id=...` - 获取音频流
- `GET  /api/auth/key` - 获取登录二维码key
- `POST /api/auth/create` - 创建登录二维码
- `POST /api/auth/check` - 检查登录状态
- `GET  /api/auth/status` - 获取认证状态

### 后端服务 (`routes.ts`)
- 房间管理: `/state`, `/queue`, `/vote-skip`
- 搜索服务: `/search`
- 音频代理: `/stream`
- 认证服务: `/auth/*`

## 项目结构

```
musicgy/
├── api.ts              # 前端API接口定义
├── App.tsx             # 主应用组件
├── index.tsx           # React入口
├── server.ts           # Express后端服务器
├── routes.ts           # API路由定义
├── services/
│   ├── netease.ts      # 网易云音乐服务
│   └── room.ts         # 房间状态管理
├── components/         # React组件
│   ├── Player.tsx      # 播放器组件
│   ├── Queue.tsx       # 队列组件
│   ├── SearchModal.tsx # 搜索弹窗
│   └── LoginModal.tsx  # 登录弹窗
├── start.js            # Bun启动脚本
└── package.json
```

## 开发说明

### 端口配置
- **前端**: 3000 (vite.config.ts)
- **后端**: 3001 (server.ts)

### 环境变量
项目会自动加载 `.env.local` 文件中的环境变量。

### 类型安全
项目使用TypeScript，所有API调用都有完整的类型定义。

## 部署说明

### 快速部署

#### Windows 用户
```bash
# 运行部署脚本
deploy.bat
```

#### Linux/macOS 用户
```bash
# 运行部署脚本
./deploy.sh
```

### 生产环境部署

#### 1. 使用 PM2 (推荐)
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs musicgy-backend

# 保存配置
pm2 save
```

#### 2. 使用 Nginx 反向代理
参考 `DEPLOYMENT.md` 中的 Nginx 配置。

#### 3. Docker 部署
```bash
# 构建镜像
docker build -t musicgy .

# 运行容器
docker run -p 3001:3001 musicgy
```

### 详细部署指南
完整的部署说明请查看 `DEPLOYMENT.md` 文件。

## 常见问题

### Q: 为什么需要同时运行前后端？
A: 前端负责UI和用户交互，后端负责：
- 代理网易云音乐API请求
- 管理播放队列状态
- 处理用户认证
- 提供音频流代理

### Q: 如何停止服务？
A: 在终端按 `Ctrl + C` 即可停止当前运行的服务。

### Q: 端口被占用怎么办？
A: 修改对应配置文件中的端口号：
- 前端: `vite.config.ts` 中的 `server.port`
- 后端: `server.ts` 中的 `PORT` 变量

### Q: 生产环境如何配置 HTTPS？
A: 使用 Nginx + Let's Encrypt，详细步骤见 `DEPLOYMENT.md`

## 技术栈

- **前端框架**: React 19.2.3
- **构建工具**: Vite 7.3.0
- **后端框架**: Express 5.2.1
- **音乐API**: @neteasecloudmusicapienhanced/api 4.29.19
- **包管理器**: Bun
- **进程管理**: PM2 (生产环境)
- **反向代理**: Nginx (生产环境)

## 许可证

MIT
