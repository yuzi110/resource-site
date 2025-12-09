/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 1. 开启 Gzip 压缩
  compress: true,

  // 🔥 2. 优化图片加载 (允许外部图片)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 允许所有域名的图片
      },
    ],
    // unoptimized: true, // 已移除，启用 Next.js 图片优化
  },


};

export default nextConfig;
