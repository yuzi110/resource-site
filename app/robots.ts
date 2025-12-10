import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // 禁止爬取后台和API
    },
    sitemap: 'https://www.wayne-res.top/sitemap.xml',
  };
}
