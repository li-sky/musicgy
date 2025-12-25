# Musicgy - 音乐协作播放平台

一个基于 Next.js 的实时音乐协作播放平台，支持网易云音乐搜索和播放。

## 项目架构

- **框架**: Next.js 16 (App Router)
- **前端**: React 19 + TypeScript
- **后端**: Next.js API Routes (集成在同一应用中)
- **音乐服务**: 网易云音乐API
- **样式**: Tailwind CSS
- **包管理器**: npm

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问应用
- 应用地址: http://localhost:3000
- API 端点: http://localhost:3000/api/*

## API端点

所有 API 端点都集成在 Next.js 应用中，无需单独启动后端服务。

- `GET  /api/state` - 获取房间状态
- `POST /api/queue` - 添加歌曲到队列
- `POST /api/vote-skip` - 投票跳过歌曲
- `GET  /api/search?q=...` - 搜索歌曲
- `GET  /api/stream?id=...` - 获取音频流
- `GET  /api/auth/key` - 获取登录二维码key
- `POST /api/auth/create` - 创建登录二维码
- `POST /api/auth/check` - 检查登录状态
- `GET  /api/auth/status` - 获取认证状态
- `POST /api/join` - 加入房间
- `POST /api/leave` - 离开房间
- `POST /api/heartbeat` - 用户心跳

## 项目结构

```
musicgy/
├── app/
│   ├── api/              # Next.js API Routes
│   │   ├── state/
│   │   ├── queue/
│   │   ├── search/
│   │   ├── stream/
│   │   ├── auth/
│   │   └── ...
│   ├── page.tsx          # 主页面（客户端组件）
│   ├── layout.tsx        # 根布局
│   └── globals.css       # 全局样式
├── components/           # React组件
│   ├── Player.tsx        # 播放器组件
│   ├── Queue.tsx         # 队列组件
│   ├── SearchModal.tsx   # 搜索弹窗
│   ├── LoginModal.tsx    # 登录弹窗
│   └── Icons.tsx         # 图标组件
├── services/
│   ├── netease.ts        # 网易云音乐服务
│   └── room.ts           # 房间状态管理
├── lib/
│   └── api.ts            # 前端API客户端
├── next.config.js        # Next.js 配置
├── tailwind.config.js    # Tailwind CSS 配置
└── package.json
```

## 开发说明

### 构建生产版本
```bash
npm run build
```

### 启动生产服务器
```bash
npm start
```

### 环境变量
项目会自动加载 `.env.local` 文件中的环境变量。

### 类型安全
项目使用TypeScript，所有API调用都有完整的类型定义。

## 部署说明

### Vercel 部署（推荐）

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. Vercel 会自动检测 Next.js 项目并部署

### 自托管部署

#### 1. 构建项目
```bash
npm run build
```

#### 2. 使用 PM2 运行
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "musicgy" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs musicgy

# 保存配置
pm2 save
```

#### 3. 使用 Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Docker 部署
```bash
# 构建镜像
docker build -t musicgy .

# 运行容器
docker run -p 3000:3000 musicgy
```

## 常见问题

### Q: Next.js 与之前的 Vite 版本有什么区别？
A: Next.js 版本将前端和后端整合到一个应用中：
- 使用 Next.js App Router 进行路由
- API Routes 替代了独立的 Express 服务器
- 服务端渲染和静态生成支持
- 更好的开发体验和性能优化
- 简化的部署流程

### Q: 如何停止服务？
A: 在终端按 `Ctrl + C` 即可停止开发服务器。

### Q: 端口被占用怎么办？
A: 使用环境变量修改端口：
```bash
PORT=3002 npm run dev
```

### Q: 生产环境如何配置 HTTPS？
A: 
- Vercel 部署自动配置 HTTPS
- 自托管使用 Nginx + Let's Encrypt

## 技术栈

- **框架**: Next.js 16.1.1
- **前端**: React 19.2.3
- **样式**: Tailwind CSS 3.4
- **TypeScript**: 5.9.3
- **音乐API**: @neteasecloudmusicapienhanced/api 4.29.19
- **包管理器**: npm

## 迁移说明

此项目已从 Vite + Express 架构迁移到 Next.js：
- 前后端合并为单一 Next.js 应用
- API 路由从 Express 迁移到 Next.js API Routes
- 使用 App Router 代替传统路由
- 保留所有原有功能

## 许可证

MIT

