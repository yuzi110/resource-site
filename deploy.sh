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

echo "✅ 构建完成！"
echo "� 请在宝塔面板的【Node项目】中手动重启项目，或者等待宝塔自动检测更新。"
