# Musicgy 部署指南

## 系统要求

### 必需软件
- **Bun** (推荐) 或 Node.js 18+
- **Git** (用于代码部署)
- **PM2** (可选，用于生产环境进程管理)

### 可选软件
- **Nginx** (用于反向代理和生产环境部署)
- **Docker** (容器化部署)

---

## 部署方式

### 方式1: 使用 Bun (推荐)

#### 1. 安装 Bun
```bash
# Linux/macOS
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

#### 2. 克隆代码
```bash
git clone <your-repo-url> musicgy
cd musicgy
```

#### 3. 安装依赖
```bash
bun install
```

#### 4. 启动应用
```bash
# 开发模式 (前端+后端)
bun run start

# 或者分别启动
bun run server    # 后端 (3001端口)
bun run dev       # 前端 (3000端口)
```

---

### 方式2: 使用 Node.js

#### 1. 安装 Node.js 18+
```bash
# 检查版本
node --version  # 需要 v18.0.0+
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 启动应用
```bash
# 后端服务器
node server.ts

# 前端开发服务器
npm run dev
```

---

### 方式3: Docker 部署

#### 1. 创建 Dockerfile
```dockerfile
# 前端构建阶段
FROM node:18-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 后端运行阶段
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=frontend /app/dist ./dist
COPY . .
EXPOSE 3001
CMD ["node", "server.ts"]
```

#### 2. 构建和运行
```bash
docker build -t musicgy .
docker run -p 3001:3001 musicgy
```

---

### 方式4: 生产环境部署 (Nginx + PM2)

#### 1. 安装 PM2
```bash
npm install -g pm2
```

#### 2. 启动后端服务
```bash
# 使用 PM2 启动后端
pm2 start server.ts --name musicgy-backend

# 保存配置
pm2 save
pm2 startup
```

#### 3. 构建前端
```bash
npm run build
```

#### 4. Nginx 配置
```nginx
# /etc/nginx/sites-available/musicgy
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/musicgy/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 音频流代理 (重要：支持大文件传输)
    location /api/stream {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # 支持 Range 请求
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_buffering off;
        proxy_cache off;
        
        # 超时设置
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

#### 5. 启动 Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 环境变量配置

### 创建 .env 文件
```bash
# 复制示例配置
cp .env.example .env
```

### 配置内容
```env
# 服务器配置
PORT=3001
NODE_ENV=production

# 网易云音乐 Cookie (可选，用于登录)
NETEASE_COOKIE=your_cookie_here

# CORS 配置
CORS_ORIGIN=http://localhost:3000
```

---

## 生产环境优化

### 1. 性能优化
```typescript
// server.ts 生产环境优化
if (process.env.NODE_ENV === 'production') {
  // 启用压缩
  app.use(compression());
  
  // 安全头
  app.use(helmet());
  
  // 请求限流
  const rateLimit = require('express-rate-limit');
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  }));
}
```

### 2. 日志管理
```bash
# 使用 PM2 日志
pm2 logs musicgy-backend
pm2 logs --lines 100
```

### 3. 监控
```bash
# PM2 监控
pm2 monit
```

---

## 端口说明

| 服务 | 开发环境 | 生产环境 |
|------|----------|----------|
| 后端 API | 3001 | 3001 (或通过 Nginx 代理) |
| 前端 Web | 3000 | 80/443 (通过 Nginx) |
| WebSocket | - | 同 HTTP 端口 |

---

## 域名和 HTTPS

### 使用 Let's Encrypt (免费 SSL)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 自动续期
```bash
sudo crontab -e
# 添加
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 故障排除

### 1. 端口被占用
```bash
# 查找占用端口的进程
lsof -i :3001
kill -9 <PID>
```

### 2. CORS 问题
确保前端配置的 API 地址正确：
```javascript
// api.ts
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com/api' 
  : 'http://localhost:3001/api';
```

### 3. 音频流无法播放
- 检查 Nginx 配置中的 Range 请求支持
- 确保防火墙允许音频流传输
- 检查浏览器控制台错误

### 4. 内存泄漏
```bash
# 使用 PM2 自动重启
pm2 start server.ts --name musicgy-backend --max-memory-restart 500M
```

---

## 备份和恢复

### 备份数据
```bash
# 备份配置
tar -czf musicgy-backup-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  /path/to/musicgy
```

### 恢复
```bash
tar -xzf musicgy-backup-20241224.tar.gz
cd musicgy
bun install
bun run start
```

---

## Serverless 环境下的 Redis 搭建指南

为了让 Redis 服务能够安全、高效地配合 Serverless (如 Vercel, AWS Lambda) 环境工作，建议采用以下方案。

### 1. 架构方案
使用 **Docker + Redis 7 + 强密码验证 + 安全组防火墙限制**。

### 2. 服务器配置步骤

#### A. 准备配置文件
在服务器创建 `/opt/redis/redis.conf`:
```conf
# 基础安全
bind 0.0.0.0
protected-mode yes
port 6379

# 核心：设置强密码 (必填)
requirepass "你的强密码_使用_openssl_rand_hex_32_生成"

# Serverless 优化：主动释放闲置连接
# 设置 60 秒超时，防止 Serverless 函数执行完毕后残留大量死连接
timeout 60
tcp-keepalive 300

# 内存与持久化
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
```

#### B. 使用 Docker Compose 启动
创建 `docker-compose.yml`:
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: musicgy-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - /opt/redis/redis.conf:/usr/local/etc/redis/redis.conf
      - /opt/redis/data:/data
    command: redis-server /usr/local/etc/redis/redis.conf
```
启动命令: `docker-compose up -d`

### 3. 安全策略 (至关重要)

1. **安全组限制**: 在云服务商后台，不要对 `0.0.0.0/0` 开放 6379。如果无法获取 Serverless 服务的固定 IP，请确保密码极度复杂。
2. **TLS 加密 (可选)**: 如果数据极其敏感，建议配置 Stunnel 或 Redis 自带的 TLS 支持。

### 4. 代码层优化 (`lib/redis.ts`)

在 Serverless 中，为了防止热重载或高并发产生过多连接，请使用单例模式：

```typescript
import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

const redis = globalForRedis.redis || new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 1,
  connectTimeout: 10000,
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
```

### 5. 连接字符串格式
`REDIS_URL=redis://:密码@服务器公网IP:6379`

---

## 性能建议

### 1. 服务器配置
- **CPU**: 2核+
- **内存**: 4GB+
- **带宽**: 10Mbps+ (音频流需要)

### 2. 数据库 (可选)
如果需要持久化用户数据，可以添加：
- Redis (缓存和会话)
- PostgreSQL (用户数据)

### 3. CDN
对于静态资源，可以使用：
- Cloudflare
- AWS CloudFront

---

## 安全建议

1. **使用 HTTPS** - 强制所有流量加密
2. **设置防火墙** - 只开放必要端口
3. **定期更新依赖** - `bun update` 或 `npm update`
4. **限制 API 访问** - 使用 rate limiting
5. **监控日志** - 定期检查异常

---

## 更新部署

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
bun install

# 重启服务
pm2 restart musicgy-backend
# 或
bun run start
```

---

## 支持

如有问题，请检查：
1. 查看控制台错误信息
2. 检查网络连接
3. 验证端口是否开放
4. 查看日志文件

**部署成功后，访问: http://your-domain.com**
