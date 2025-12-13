import { supabase } from "@/src/lib/supabaseClient";
import BlogListClient, { Article } from "@/components/blog/BlogListClient";

// 🔥 启用 ISR: 60秒缓存
// 这意味着页面在服务器构建一次后，会缓存60秒。这期间的所有访问都极快（直接返回 HTML）。
// 60秒后有新请求，后台会重新生成页面。
export const revalidate = 60;

export default async function BlogListPage() {
  try {
    const { data } = await supabase
      .from("articles")
      .select("id, title, cover_url, created_at, view_count, category, is_pinned, like_count, comments(count)")
      .eq("status", "published")
      // 数据库层面先按置顶排序，再按时间排序
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    // Supabase 返回的 comments 是数组，类型转换一下
    const articles = (data || []) as unknown as Article[];

    return <BlogListClient initialArticles={articles} />;
  } catch (error) {
    console.error("Blog List SSR Error:", error);
    return <BlogListClient initialArticles={[]} />;
  }
}
