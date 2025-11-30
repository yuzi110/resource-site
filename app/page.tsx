"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      const { data } = await supabase
        .from("resources")
        .select("*")
        .order("id", { ascending: false });
      if (data) setResources(data);
      setLoading(false);
    };
    fetchResources();
  }, []);

  // 辅助函数：判断有几个网盘
  // const getDriveCount = (res: Resource) => {
  //   let count = 0;
  //   if (res.quark_link) count++;
  //   if (res.baidu_link) count++;
  //   if (res.xunlei_link) count++;
  //   return count;
  // };

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
                      <Image
                        src={item.cover_url}
                        alt={item.title}
                        fill
                        className="object-cover object-top"
                        unoptimized
                      />
                      {/* 分类标签 */}
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
                         {/* 显示网盘数量图标 */}
                         <div className="flex gap-1">
                            {item.quark_link && <Image src="https://img.icons8.com/color/48/cloud-folder.png" width={16} height={16} className="w-4 h-4" alt="夸克" unoptimized />}
                            {item.baidu_link && <Image src="https://img.icons8.com/color/48/baidu.png" width={16} height={16} className="w-4 h-4" alt="百度" unoptimized />}
                         </div>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>

                {/* 🔥 修复核心：
                   1. max-w-md w-full: 限制宽度
                   2. h-[80vh]: 强制高度为屏幕 80%
                   3. flex flex-col: 弹性布局，让 footer 自动沉底
                   4. p-0: 去掉默认内边距
                */}
                <DialogContent className="max-w-md w-[90%] rounded-2xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden outline-none">

                  {/* Header: 固定高度 */}
                  <div className="p-4 border-b bg-white z-20 flex-shrink-0">
                    <DialogTitle className="text-base font-bold text-center line-clamp-1">
                      {item.title}
                    </DialogTitle>
                  </div>

                  {/* Body: 占据剩余空间 (flex-1)，超出部分滚动 */}
                  <ScrollArea className="flex-1 bg-gray-50 w-full">
                    <div className="w-full">
                      <Image
                        src={item.cover_url}
                        alt="详情长图"
                        width={500}
                        height={800}
                        className="w-full h-auto block"
                        unoptimized
                      />
                    </div>
                  </ScrollArea>

                  {/* Footer: 固定在底部，绝对不会被遮挡 */}
                  <div className="p-4 border-t bg-white z-20 flex-shrink-0 space-y-2 pb-6 safe-area-bottom">
                    {/* 夸克按钮 (主推) */}
                    {item.quark_link && (
                      <Button
                        className="w-full bg-[#008aff] hover:bg-[#0076db] text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                        onClick={() => window.open(item.quark_link, '_blank')}
                      >
                        <span>☁️ 保存到夸克网盘</span>
                      </Button>
                    )}

                    {/* 其他网盘 (双列布局) */}
                    <div className="grid grid-cols-2 gap-3">
                      {item.baidu_link && (
                        <Button
                          variant="outline"
                          className="w-full h-10 rounded-lg text-gray-700 border-blue-200 hover:bg-blue-50"
                          onClick={() => window.open(item.baidu_link, '_blank')}
                        >
                          百度网盘
                        </Button>
                      )}
                      {item.xunlei_link && (
                        <Button
                          variant="outline"
                          className="w-full h-10 rounded-lg text-gray-700 border-blue-200 hover:bg-blue-50"
                          onClick={() => window.open(item.xunlei_link, '_blank')}
                        >
                          迅雷云盘
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
