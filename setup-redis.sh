#!/bin/bash

# =================================================================
# Musicgy Redis 一键安全部署脚本 (Let's Encrypt TLS 版)
# =================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# 默认域名
DOMAIN="skyli.xyz"
LE_PATH="/etc/letsencrypt/live/$DOMAIN"

echo -e "${GREEN}>>> 开始部署 Redis (TLS) using Let's Encrypt for $DOMAIN...${NC}"

# 1. 检查证书是否存在
if [ ! -d "$LE_PATH" ]; then
  echo -e "${RED}错误: 找不到证书目录 $LE_PATH${NC}"
  echo -e "请确认该路径下存在 fullchain.pem 和 privkey.pem"
  exit 1
fi

if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}错误: 请先安装 Docker。${NC}"
  exit 1
fi

# 2. 准备目录
CONF_DIR="/opt/redis"
CERT_DIR="$CONF_DIR/certs"
DATA_DIR="$CONF_DIR/data"

sudo mkdir -p "$CERT_DIR" "$DATA_DIR"

# 3. 复制证书 (避免直接挂载 /etc/letsencrypt 导致的权限问题)
echo -e "${GREEN}>>> 正在复制证书...${NC}"
sudo cp "$LE_PATH/fullchain.pem" "$CERT_DIR/redis.crt"
sudo cp "$LE_PATH/privkey.pem" "$CERT_DIR/redis.key"

# 修正权限：Redis 容器内默认运行用户 id 为 999
sudo chown -R 999:999 "$CERT_DIR"
sudo chmod 644 "$CERT_DIR/redis.crt"
sudo chmod 600 "$CERT_DIR/redis.key"

# 4. 生成 Redis 配置
REDIS_PASSWORD=$(openssl rand -hex 16)
cat <<EOF > "$CONF_DIR/redis.conf"
# 端口配置
port 0
tls-port 6379
requirepass ${REDIS_PASSWORD}

# TLS 配置
tls-cert-file /etc/redis/certs/redis.crt
tls-key-file /etc/redis/certs/redis.key
tls-auth-clients no
tls-protocols "TLSv1.2 TLSv1.3"

# Serverless 优化
timeout 60
tcp-keepalive 300
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
EOF

# 5. 启动容器
echo -e "${GREEN}>>> 正在启动 Redis 容器...${NC}"
docker stop musicgy-redis 2>/dev/null || true
docker rm musicgy-redis 2>/dev/null || true

docker run -d \
  --name musicgy-redis \
  --restart always \
  -p 6379:6379 \
  -v "$CONF_DIR/redis.conf:/usr/local/etc/redis/redis.conf" \
  -v "$CERT_DIR:/etc/redis/certs" \
  -v "$DATA_DIR:/data" \
  redis:7-alpine redis-server /usr/local/etc/redis/redis.conf

# 6. 提示信息
PUBLIC_IP=$(curl -s https://ifconfig.me)

echo -e "\n${GREEN}=================================================================${NC}"
echo -e "部署成功！已使用 ${GREEN}$DOMAIN${NC} 的证书开启 TLS"
echo -e ""
echo -e "连接协议: ${GREEN}rediss://${NC}"
echo -e "Redis 密码: ${GREEN}${REDIS_PASSWORD}${NC}"
echo -e "连接 URL:   ${GREEN}rediss://:${REDIS_PASSWORD}@${DOMAIN}:6379${NC}"
echo -e ""
echo -e "${RED}注意：${NC}因为使用了有效证书，客户端连接时不需要禁用证书验证。"
echo -e "记得每 2-3 个月(证书更新后)重新运行此脚本，或设置 Cron 任务自动复制新证书并重启容器。"
echo -e "${GREEN}=================================================================${NC}"