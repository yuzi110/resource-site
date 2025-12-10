import { MetadataRoute } from 'next';
import { supabase } from '@/src/lib/supabaseClient';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.wayne-res.top';

  // 1. 获取所有已发布的文章
  const { data: articles } = await supabase
    .from('articles')
    .select('id, created_at')
    .eq('status', 'published') // 只收录已发布的
    .order('created_at', { ascending: false });

  // 2. 静态路由
  const routes = [
    '',
    '/blog',
    '/guide.html', // 中间页
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // 3. 动态文章路由
  const articleRoutes = (articles || []).map((article) => ({
    url: `${baseUrl}/blog/${article.id}`,
    lastModified: article.created_at,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...routes, ...articleRoutes];
}
