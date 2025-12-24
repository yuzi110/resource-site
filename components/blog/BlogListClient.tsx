"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Calendar, Pin, ThumbsUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export interface Article {
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

interface BlogListClientProps {
  initialArticles: Article[];
}

export default function BlogListClient({ initialArticles }: BlogListClientProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    // 记录用户访问博客列表的时间
    localStorage.setItem('last_blog_visit', new Date().toISOString());
  }, []);

  const categories = [
    { id: 'all', label: '全部' },
    { id: 'newcomer', label: '新人' },
    { id: 'new_work', label: '新作' },
    { id: 'news', label: '新闻' },
    { id: 'domestic', label: '国产' }, // Assuming these exist based on context
    { id: 'japan_korea', label: '日韩' },
  ];
  // Wait, I should stick to the categories present in the original file or implied by the project plan.
  // Original file had: all, newcomer, new_work, news.
  // Project plan mentions: "全部", "精选", "国产", "日韩".
  // I will use the categories from the code I read earlier to be safe, but maybe add the ones from plan if missing?
  // Original code read:
  // const categories = [
  //   { id: 'all', label: '全部' },
  //   { id: 'newcomer', label: '新人' },
  //   { id: 'new_work', label: '新作' },
  //   { id: 'news', label: '新闻' },
  // ];
  // I will stick to the code I read.

  const categoriesList = [
      { id: 'all', label: '全部' },
      { id: 'newcomer', label: '新人' },
      { id: 'new_work', label: '新作' },
      { id: 'news', label: '新闻' },
  ];

  const filteredArticles = articles
    .filter(item => selectedCategory === 'all' || item.category === selectedCategory)
    .sort((a, b) => {
      // 客户端再次排序确保置顶在最前 (虽然服务端已经排过 created_at，但置顶可能需要再次处理)
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // 如果置顶状态相同，按时间倒序 (assuming initialArticles is already sorted by time)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          精选专栏
          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold animate-pulse">
            最新
          </span>
        </h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 分类筛选 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
          {categoriesList.map(cat => (
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

        {/* 文章列表 */}
        <div className="space-y-4">
          {filteredArticles.map(article => (
            <Link href={`/blog/${article.id}`} key={article.id} className="block">
              <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.99]">
                <div className="flex">
                  {/* 左侧封面图 - 保持 4:3 或 16:9 */}
                  <div className="w-1/3 min-w-[120px] bg-gray-100 relative aspect-[4/3]">
                    <Image
                      src={article.cover_url}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 200px"
                    />
                    {article.is_pinned && (
                      <div className="absolute top-0 left-0 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-br-lg font-bold flex items-center gap-0.5">
                        <Pin className="w-2.5 h-2.5" /> 置顶
                      </div>
                    )}
                  </div>

                  {/* 右侧内容 */}
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-1">
                         {article.title}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-2">
                         {article.category && (
                           <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                             {categoriesList.find(c => c.id === article.category)?.label || article.category}
                           </span>
                         )}
                         {isNew(article.created_at) && (
                           <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">
                             NEW
                           </span>
                         )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-gray-400 text-xs mt-1">
                      <div className="flex items-center gap-3">
                         <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(article.view_count || 0) * 10}</span>
                         <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {article.like_count || 0}</span>
                         <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {article.comments?.[0]?.count || 0}</span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {filteredArticles.length === 0 && (
             <div className="py-20 text-center text-gray-400 text-sm">暂无该分类文章</div>
          )}
        </div>
      </div>
    </div>
  );
}
