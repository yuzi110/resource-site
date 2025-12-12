"use client";

// 🔥 强制动态渲染，禁用 Next.js 构建缓存
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Eye, Calendar, Pin, ThumbsUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

import Image from "next/image";

interface Article {
  id: number;
  title: string;
  cover_url: string;
  created_at: string;
  view_count: number;
  category?: string;
  is_pinned?: boolean;
  like_count?: number;
  comments?: { count: number }[];
}

export default function BlogListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    // 记录用户访问博客列表的时间
    localStorage.setItem('last_blog_visit', new Date().toISOString());

    const fetchArticles = async () => {
      // 🔥 获取文章列表，同时获取评论数 (需要 comments 表有 article_id 外键)
      const { data } = await supabase
        .from("articles")
        .select("id, title, cover_url, created_at, view_count, category, is_pinned, like_count, comments(count)")
        .eq("status", "published") // 🔥 只显示已发布的文章
        .order("created_at", { ascending: false });

      if (data) {
        // @ts-ignore: Supabase 类型推断有时不准确，手动强转
        setArticles(data as unknown as Article[]);
      }
      setLoading(false);
    };
    fetchArticles();
  }, []);

  const categories = [
    { id: 'all', label: '全部' },
    { id: 'newcomer', label: '新人' },
    { id: 'new_work', label: '新作' },
    { id: 'news', label: '新闻' },
  ];

  const filteredArticles = articles
    .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });

  const isNew = (dateStr: string) => {
    if (now === 0) return false;
    return (now - new Date(dateStr).getTime()) < 24 * 60 * 60 * 1000;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* 顶部导航 */}
      <div className="bg-white sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/">
          <Button variant="ghost" size="icon" className="-ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-gray-800">精选专栏</h1>
        <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded ml-2 animate-pulse">Live</span>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 分类筛选 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap rounded-full px-4 ${selectedCategory === cat.id ? 'bg-black text-white' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">暂无文章，敬请期待</div>
        ) : (
          filteredArticles.map((item) => (
            <Link href={`/blog/${item.id}`} key={item.id} className="block mb-4 group">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row h-auto sm:h-32 relative">
                {/* 封面图 */}
                <div className="w-full sm:w-48 h-48 sm:h-full bg-gray-100 flex-shrink-0 relative">
                  <Image
                    src={item.cover_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 200px"
                  />
                  {/* NEW 角标 */}
                  {isNew(item.created_at) && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                      NEW
                    </div>
                  )}
                </div>
                {/* 内容区 */}
                <div className="p-4 flex flex-col justify-between flex-1 relative">
                   {/* 置顶图标 */}
                   {item.is_pinned && (
                    <div className="absolute top-2 right-2 text-blue-500">
                      <Pin className="w-4 h-4 fill-current rotate-45" />
                    </div>
                  )}
                  <h3 className="font-bold text-gray-800 line-clamp-2 text-base sm:text-lg pr-6">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* 数据统计栏 */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{item.view_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{item.like_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {/* comments 是个数组 [{count: n}] */}
                        <span>{item.comments?.[0]?.count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
