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
echo "🔨 正在构建 (这可能需要几分钟)..."
npm run build

# 6. 重启服务
echo "🔄 重启 PM2 服务..."
# 尝试重载，如果失败（进程不存在）则重新启动
if pm2 reload resource-site 2>/dev/null; then
    echo "✅ 服务已重载"
else
    echo "⚠️ 服务未运行，正在启动..."
    pm2 start npm --name "resource-site" -- start
    pm2 save
fi

echo "🎉 部署完成！"
