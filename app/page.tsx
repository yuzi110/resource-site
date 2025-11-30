"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Resource {
  id: number;
  title: string;
  cover_url: string;
  category: string;
  quark_link: string;
  baidu_link?: string;
  xunlei_link?: string;
  yidong_link?: string; // 新增移动云盘
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
      if (data) setResources(data);
      setLoading(false);
    };
    fetchResources();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* 顶部 Header */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-10 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            严选资源站
          </h1>
          <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            每日更新
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3">
        {loading ? (
          <div className="text-center py-20 text-gray-400">资源加载中...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {resources.map((item) => (
              <Dialog key={item.id}>
                <DialogTrigger asChild>
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer active:scale-95 transition-all duration-200">
                    {/* 图片区域 */}
                    <div className="aspect-[3/4] relative bg-gray-100 overflow-hidden">
                      <img
                        src={item.cover_url}
                        alt={item.title}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute top-1.5 right-1.5">
                         <span className="bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-md">
                           {item.category}
                         </span>
                      </div>
                    </div>

                    {/* 标题区域 */}
                    <div className="p-2.5">
                      <h2 className="text-[13px] font-medium text-gray-800 line-clamp-2 leading-snug h-[2.4em]">
                        {item.title}
                      </h2>
                      <div className="mt-2.5 flex items-center justify-between">
                         <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                           点击查看
                         </span>
                         {/* 图标组 */}
                         <div className="flex gap-1">
                            {item.quark_link && <img src="https://img.icons8.com/color/48/cloud-folder.png" className="w-4 h-4" alt="夸克"/>}
                            {item.baidu_link && <img src="https://img.icons8.com/color/48/baidu.png" className="w-4 h-4" alt="百度"/>}
                         </div>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>

                {/* 🔥 关键修复点：
                   1. flex flex-col: 垂直布局
                   2. h-[80vh] 或 h-[85vh]: 固定高度
                   3. 内部 ScrollArea 必须加 min-h-0，否则会被撑爆
                */}
                <DialogContent className="max-w-md w-[90%] rounded-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden outline-none bg-white">

                  {/* Header: 固定 */}
                  <div className="p-4 border-b bg-white z-20 flex-shrink-0">
                    <DialogTitle className="text-base font-bold text-center line-clamp-1">
                      {item.title}
                    </DialogTitle>
                  </div>

                  {/* Body: 核心修复 min-h-0 */}
                  <ScrollArea className="flex-1 min-h-0 bg-gray-50 w-full">
                    <div className="w-full">
                      <img
                        src={item.cover_url}
                        alt="详情长图"
                        className="w-full h-auto block"
                      />
                    </div>
                  </ScrollArea>

                  {/* Footer: 固定在底部，加了 safe-area 适配 */}
                  <div className="p-4 border-t bg-white z-20 flex-shrink-0 space-y-3 pb-8">
                    {/* 夸克按钮 (最醒目) */}
                    {item.quark_link && (
                      <Button
                        className="w-full bg-[#008aff] hover:bg-[#0076db] text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                        onClick={() => window.open(item.quark_link, '_blank')}
                      >
                        <span>☁️ 保存到夸克网盘</span>
                      </Button>
                    )}

                    {/* 其他网盘 (多列布局) */}
                    <div className="grid grid-cols-2 gap-2">
                      {item.baidu_link && (
                        <Button
                          variant="outline"
                          className="w-full h-10 rounded-lg text-gray-700 border-blue-200 hover:bg-blue-50 text-xs"
                          onClick={() => window.open(item.baidu_link, '_blank')}
                        >
                          百度网盘
                        </Button>
                      )}
                      {item.xunlei_link && (
                        <Button
                          variant="outline"
                          className="w-full h-10 rounded-lg text-gray-700 border-blue-200 hover:bg-blue-50 text-xs"
                          onClick={() => window.open(item.xunlei_link, '_blank')}
                        >
                          迅雷云盘
                        </Button>
                      )}
                      {/* 移动云盘 (如果有) */}
                      {item.yidong_link && (
                        <Button
                          variant="outline"
                          className="w-full h-10 rounded-lg text-gray-700 border-blue-200 hover:bg-blue-50 text-xs"
                          onClick={() => window.open(item.yidong_link, '_blank')}
                        >
                          移动云盘
                        </Button>
                      )}
                    </div>
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
