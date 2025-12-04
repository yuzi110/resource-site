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
    unoptimized: true, // 如果你没用 Next/Image 组件，这行可以不加，但加上保险
  },

  // 🔥 3. 减少构建体积 (可选)
  swcMinify: true,
};

export default nextConfig;
