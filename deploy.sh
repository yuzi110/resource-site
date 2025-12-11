#!/bin/bash

# 1. 确保在正确的目录
cd /www/wwwroot/resource-site

echo "🚀 开始部署..."

# 2. 强制丢弃本地修改（防止 package-lock.json 冲突）
echo "📦 重置本地更改..."
git checkout .

# 3. 拉取最新代码
echo "⬇️ 拉取最新代码..."
git pull

# 4. 安装依赖
echo "npm install..."
npm install

# 5. 构建项目
echo "🧹 清理旧构建缓存..."
rm -rf .next

echo "🔨 正在构建 (这可能需要几分钟)..."
npm run build

echo "🎉 代码更新与构建完成！"
echo "⚠️ 请前往宝塔面板 -> 网站 -> Node项目 -> 点击【重启】以应用更改。"
