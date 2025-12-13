#!/bin/bash
set -e # 遇到错误立即退出，防止构建失败还去停服务

# 宝塔项目名称 (用户确认为 resource-site)
APP_NAME="resource-site"
# 备用名称
ALT_NAME="resource_site"

echo "📥 拉取最新代码..."
git pull

echo "📦 安装依赖..."
npm install

echo "🧹 清理旧缓存..."
rm -rf .next

echo "🏗️ 开始构建..."
npm run build

echo "🛑 构建成功！准备重启服务..."

# 1. 尝试停止两种可能命名的 PM2 进程
pm2 delete $APP_NAME 2>/dev/null || true
pm2 delete $ALT_NAME 2>/dev/null || true

# 2. 🔥 必杀技：如果端口 3000 依然被占（僵尸进程），必须强杀
pid=$(lsof -t -i:3000)
if [ -n "$pid" ]; then
  echo "🔪 发现端口 3000 被 PID $pid 占用，强制释放..."
  kill -9 $pid
fi

echo "🚀 启动服务..."
pm2 start npm --name "$APP_NAME" -- start

echo "✅ 部署完成！"
