#!/bin/bash

# 宝塔项目名称 (根据截图是 resource_site)
APP_NAME="resource_site"

echo "📥 拉取最新代码..."
git pull

echo "🧹 清理旧缓存..."
rm -rf .next

echo "📦 安装依赖..."
npm install

echo "🏗️ 开始构建..."
npm run build

echo "🚀 重载服务..."
# 优先尝试平滑重载 (Reload)，如果服务不存在则启动 (Start)
# 这样可以保持与宝塔的兼容性，只要名称一致
pm2 reload $APP_NAME 2>/dev/null || pm2 start npm --name "$APP_NAME" -- start

echo "✅ 部署完成！"
