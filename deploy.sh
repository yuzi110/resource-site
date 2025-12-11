#!/bin/bash

echo "� 停止服务..."
# 尝试停止 PM2 服务，如果不存在也不报错
pm2 delete resource-site 2>/dev/null || true

echo "📥 拉取最新代码..."
git pull

echo "🧹 清理旧缓存..."
rm -rf .next

echo "📦 安装依赖..."
npm install

echo "🏗️ 开始构建..."
npm run build

echo "🚀 启动服务..."
# 使用 pm2 启动，名称为 resource-site
pm2 start npm --name "resource-site" -- start

echo "✅ 部署完成！"
