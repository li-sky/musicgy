#!/bin/bash

# Musicgy 快速部署脚本

set -e  # 遇到错误立即退出

echo "🎵 Musicgy 部署脚本"
echo "=================="

# 检查是否安装了 Bun
if ! command -v bun &> /dev/null; then
    echo "❌ 未检测到 Bun，正在安装..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
else
    echo "✅ Bun 已安装"
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 拉取最新代码（如果在 git 仓库中）
if [ -d ".git" ]; then
    echo "📥 拉取最新代码..."
    git pull origin main
fi

# 安装依赖
echo "📦 安装依赖..."
bun install

# 创建日志目录
mkdir -p logs

# 检查环境变量
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，创建示例配置..."
    cat > .env << 'EOF'
PORT=3001
NODE_ENV=production
# NETEASE_COOKIE=your_cookie_here
EOF
    echo "请编辑 .env 文件配置必要的环境变量"
fi

# 构建前端
echo "🔨 构建前端..."
bun run build

# 选择启动方式
echo ""
echo "请选择启动方式:"
echo "1) 开发模式 (前端+后端)"
echo "2) 生产模式 (PM2)"
echo "3) 仅启动后端"
echo "4) 仅启动前端"
read -p "输入选项 [1-4]: " choice

case $choice in
    1)
        echo "🚀 启动开发模式..."
        bun run start
        ;;
    2)
        # 检查 PM2
        if ! command -v pm2 &> /dev/null; then
            echo "📥 安装 PM2..."
            npm install -g pm2
        fi
        
        echo "🚀 启动生产模式 (PM2)..."
        pm2 start ecosystem.config.js
        pm2 save
        echo ""
        echo "📊 查看状态: pm2 status"
        echo "📋 查看日志: pm2 logs musicgy-backend"
        echo "🔄 重启服务: pm2 restart musicgy-backend"
        ;;
    3)
        echo "🚀 仅启动后端..."
        bun run server
        ;;
    4)
        echo "🚀 仅启动前端..."
        bun run dev
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac
