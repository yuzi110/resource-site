"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";

// 引入 UI 组件
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge"; // 如果报错，运行 npx shadcn@latest add badge，或者直接用 div 代替

interface Resource {
  id: number;
  title: string;
  cover_url: string;
  quark_link: string;
  category: string;
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("id", { ascending: false });

      if (error) console.error("Error:", error);
      else setResources(data || []);
      setLoading(false);
    };

    fetchResources();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* 顶部 Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            严选资源站
          </h1>
          <span className="text-xs text-gray-400">每日更新</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">资源加载中...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {resources.map((item) => (
              <Dialog key={item.id}>
                {/* 触发器：点击这个卡片打开弹窗 */}
                <DialogTrigger asChild>
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-all group">
                    {/* 图片区域：强制显示顶部，长图裁切 */}
                    <div className="aspect-[3/4] relative bg-gray-100 overflow-hidden">
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"/>
                      {/* 右上角分类标签 */}
                      <div className="absolute top-2 right-2">
                         <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                           {item.category}
                         </span>
                      </div>
                    </div>

                    {/* 标题区域 */}
                    <div className="p-3">
                      <h2 className="text-sm font-medium text-gray-800 line-clamp-2">
                        {item.title}
                      </h2>
                      <div className="mt-2 flex items-center justify-between">
                         <span className="text-xs text-blue-500 font-semibold">查看详情</span>
                         <span className="text-[10px] text-gray-400">夸克网盘</span>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>

                {/* 弹窗内容：展示完整长图 */}
                <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">

                  {/* 弹窗头部 */}
                  <div className="p-4 border-b bg-white flex-shrink-0 z-20">
                    <DialogTitle className="text-lg line-clamp-1 text-center">{item.title}</DialogTitle>
                  </div>

                  {/* 滚动区域：放长图 */}
                  <ScrollArea className="flex-1 bg-gray-50">
                    <div className="p-0">
                      <img src={item.cover_url} alt={item.title} className="w-full h-auto block" />
                    </div>
                  </ScrollArea>

                  {/* 底部固定按钮 */}
                  <div className="p-4 border-t bg-white flex-shrink-0 z-20">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl text-lg shadow-lg shadow-blue-200"
                      onClick={() => window.open(item.quark_link, '_blank')}
                    >
                      📂 保存到夸克网盘
                    </Button>
                    <p className="text-center text-[10px] text-gray-400 mt-2">
                      需下载夸克App查看完整内容
                    </p>
                  </div>

                </DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
