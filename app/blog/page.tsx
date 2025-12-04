"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Article {
  id: number;
  title: string;
  cover_url: string;
  created_at: string;
  view_count: number;
}

export default function BlogListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, cover_url, created_at, view_count")
        .order("created_at", { ascending: false });
      if (data) setArticles(data);
      setLoading(false);
    };
    fetchArticles();
  }, []);

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
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">暂无文章，敬请期待</div>
        ) : (
          articles.map((item) => (
            <Link href={`/blog/${item.id}`} key={item.id}>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row h-auto sm:h-32">
                {/* 封面图：移动端是大图，电脑端是左侧小图 */}
                <div className="w-full sm:w-48 h-48 sm:h-full bg-gray-100 flex-shrink-0">
                  <img
                    src={item.cover_url}
                    className="w-full h-full object-cover"
                    alt={item.title}
                  />
                </div>
                {/* 内容区 */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <h3 className="font-bold text-gray-800 line-clamp-2 text-base sm:text-lg">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{item.view_count || 0}</span>
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
