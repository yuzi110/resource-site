import { supabase } from "@/src/lib/supabaseClient";
import BlogDetailClient, { Article, Comment } from "@/components/blog/BlogDetailClient";
import { notFound } from "next/navigation";

// 🔥 启用 ISR: 60秒缓存
export const revalidate = 60;

// 预渲染最新的 20 篇文章，秒开
export async function generateStaticParams() {
  try {
    const { data } = await supabase
      .from("articles")
      .select("id")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20);

    return (data || []).map((article) => ({
      id: article.id.toString(),
    }));
  } catch (e) {
    return [];
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. 获取文章详情
  const { data: articleData } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!articleData) {
    notFound();
  }

  // 2. 获取评论
  const { data: commentsData } = await supabase
    .from("comments")
    .select("*")
    .eq("article_id", id)
    .eq("is_approved", true)
    .order("created_at", { ascending: true });

  // 3. 服务端构建评论树，减少客户端计算量
  const rootComments: Comment[] = [];
  if (commentsData) {
    const commentMap = new Map();

    // 初始化 Map
    commentsData.forEach((c: any) => {
      c.children = [];
      commentMap.set(c.id, c);
    });

    // 组装树
    commentsData.forEach((c: any) => {
      if (c.parent_id) {
        const parent = commentMap.get(c.parent_id);
        if (parent) {
          parent.children.push(c);
        } else {
          // 孤儿评论（父评论被删），作为顶级评论展示
          rootComments.push(c);
        }
      } else {
        rootComments.push(c);
      }
    });

    // 倒序排列顶级评论（最新的在最前）
    rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return (
    <BlogDetailClient
      initialArticle={articleData as unknown as Article}
      initialComments={rootComments}
    />
  );
}
