"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { toast } from "sonner";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from "embla-carousel-autoplay";
import { Bookmark, Share2, Megaphone, Search, X, Loader2, BookOpen, ArrowRight, Smartphone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// UI 组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- 类型定义 ---
export interface Resource {
  id: number;
  title: string;
  cover_url: string;
  category: string;
  quark_link: string;
  baidu_link?: string;
  xunlei_link?: string;
  yidong_link?: string;
}

export interface Banner {
  id: number;
  image_url: string;
  title: string;
  type: 'link' | 'dialog' | 'resource';
  link_url?: string;
  dialog_content?: string;
  resource_id?: number;
}

// 兼容性更好的复制函数
const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("Clipboard API unavailable");
  } catch (err) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.error("Copy failed:", fallbackErr);
      return false;
    }
  }
};

interface HomeClientProps {
  initialResources: Resource[];
  initialBanners: Banner[];
}

export default function HomeClient({ initialResources, initialBanners }: HomeClientProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [loading, setLoading] = useState(false); // 初始不再 loading，因为数据已有
  const [searchQuery, setSearchQuery] = useState("");

  // 分页状态
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 轮播图状态
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);
  const [openBannerDialog, setOpenBannerDialog] = useState<Banner | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // 添加到桌面引导
  const [showAddToHome, setShowAddToHome] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasNewArticle, setHasNewArticle] = useState(false);

  useEffect(() => {
    setMounted(true);
    const ua = navigator.userAgent.toLowerCase();
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      setIsMobile(true);
    }

    // Check for new articles
    const checkNewArticles = async () => {
      try {
        const { data } = await supabase
          .from('articles')
          .select('created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const lastVisit = localStorage.getItem('last_blog_visit');
          if (!lastVisit || new Date(data.created_at) > new Date(lastVisit)) {
            setHasNewArticle(true);
          }
        }
      } catch (e) {
        // console.error("Failed to check new articles", e);
      }
    };
    checkNewArticles();
  }, []);

  const handleOpenLink = async (url: string) => {
    window.open(url, '_blank');
  };

  // 搜索逻辑
  const performSearch = async (queryText: string) => {
    setLoading(true);
    setPage(0);
    setHasMore(true);

    try {
      let resQuery = supabase.from("resources").select("*").order("id", { ascending: false });

      if (queryText) {
        resQuery = resQuery.ilike('title', `%${queryText}%`).limit(50);
      } else {
        // 如果清空搜索，恢复初始数据（或者重新拉取第一页）
        // 这里选择重新拉取，保证数据最新
        resQuery = resQuery.range(0, 11);
      }

      const { data: resData } = await resQuery;
      if (resData) {
        setResources(resData);
        if (!queryText && resData.length < 12) setHasMore(false);
        if (queryText) setHasMore(false);
      }
      
      // 注意：搜索时不重新拉取 Banner，保持初始的 Banner
    } catch (error) {
      toast.error("搜索失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    performSearch(searchQuery);
  };

  // 加载更多
  const loadMore = async () => {
    if (isLoadingMore || !hasMore || searchQuery) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    const start = nextPage * 12;
    const end = start + 11;

    try {
      const { data } = await supabase
        .from("resources")
        .select("*")
        .order("id", { ascending: false })
        .range(start, end);

      if (data && data.length > 0) {
        setResources((prev) => [...prev, ...data]);
        setPage(nextPage);
        if (data.length < 12) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      toast.error("加载更多失败");
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, isLoadingMore, resources]);

  const handleBannerClick = async (banner: Banner) => {
    if (banner.type === 'link' && banner.link_url) {
      handleOpenLink(banner.link_url);
    } else if (banner.type === 'dialog') {
      setOpenBannerDialog(banner);
    } else if (banner.type === 'resource' && banner.resource_id) {
      const found = resources.find(r => r.id === banner.resource_id);
      if (found) {
        setSelectedResource(found);
      } else {
        const { data } = await supabase.from("resources").select("*").eq("id", banner.resource_id).single();
        if (data) setSelectedResource(data);
        else toast.error("资源不存在或已删除");
      }
    }
  };

  const handleShare = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      toast.success("链接已复制！");
    } else {
      toast.error("复制失败");
    }
  };

  const handleBookmark = () => { toast.info("请按 Ctrl+D 收藏本站 ⭐"); };

  return (
    <main className="min-h-screen bg-[#F3F4F6] pb-24 relative selection:bg-black selection:text-white">

      {/* 1. Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex justify-between items-center w-full md:w-auto">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
              <div className="h-8 w-auto flex items-center justify-center overflow-hidden">
                 <img
                   src="/logo.png"
                   alt="Logo"
                   className="h-full w-auto object-contain"
                   onError={(e) => {
                     e.currentTarget.style.display = 'none';
                     e.currentTarget.nextElementSibling?.classList.remove('hidden');
                   }}
                 />
                 <div className="hidden font-black text-2xl tracking-tighter italic text-slate-900">LOGO</div>
              </div>
              <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
              <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Premium</span>
            </div>
            <Link href="/blog" className="md:hidden relative">
               <Button variant="ghost" size="sm" className={`text-gray-600 hover:bg-gray-100 rounded-lg px-3 ${hasNewArticle ? 'text-red-600 bg-red-50 hover:bg-red-100' : ''}`}>
                 <BookOpen className={`w-4 h-4 mr-1 ${hasNewArticle ? 'text-red-500' : ''}`}/> 专栏
               </Button>
               {hasNewArticle && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse"></span>}
            </Link>
          </div>
          <div className="flex items-center gap-3 w-full md:max-w-md">
            <form onSubmit={handleSearch} className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
              <Input type="search" placeholder="搜索资源..." className="pl-10 pr-4 h-10 bg-gray-100 border-transparent focus:bg-white focus:border-gray-300 focus:ring-2 focus:ring-black/5 rounded-xl w-full text-sm transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </form>
            <Link href="/blog" className="hidden md:flex flex-shrink-0 relative">
               <Button variant="ghost" className={`font-medium rounded-xl ${hasNewArticle ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}>
                 <BookOpen className={`w-4 h-4 mr-2 ${hasNewArticle ? 'text-red-500' : ''}`}/> 精选专栏
               </Button>
               {hasNewArticle && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse"></span>}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8 mt-2">

        {/* --- 2. 轮播图区域 (Banner) --- */}
        {banners.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-gray-200 relative group z-0">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className="flex-[0_0_100%] min-w-0 relative aspect-[3/1] cursor-pointer"
                    onClick={() => handleBannerClick(banner)}
                  >
                    <Image
                      src={banner.image_url}
                      alt={banner.title}
                      fill
                      priority={true}
                      sizes="(max-width: 768px) 100vw, 1200px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-full p-3 md:p-8 flex items-center justify-between gap-4">
                        <h3 className="text-sm md:text-2xl font-bold text-white shadow-sm line-clamp-1 flex-1">
                          {banner.title}
                        </h3>
                        <div className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white text-black px-2.5 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold hover:bg-gray-100 transition-colors">
                          <span className="md:hidden">
                            {banner.type === 'link' && 'GO'}
                            {banner.type === 'dialog' && '看公告'}
                            {banner.type === 'resource' && '看资源'}
                          </span>
                          <span className="hidden md:inline">
                            {banner.type === 'link' && '点击跳转'}
                            {banner.type === 'dialog' && '查看公告'}
                            {banner.type === 'resource' && '获取资源'}
                          </span>
                          <ArrowRight className="w-3 h-3"/>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- 3. 资源列表 --- */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-4">
             <div className="w-1 h-5 bg-black rounded-full"></div>
             <h2 className="text-base font-bold text-gray-900 tracking-tight">
               {searchQuery ? `"${searchQuery}" 搜索结果` : "最新上架"}
             </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3"><Loader2 className="w-8 h-8 animate-spin text-gray-900" /><p className="text-sm">加载中...</p></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 z-0">
              {resources.map((item) => (
                <div key={item.id} onClick={() => setSelectedResource(item)}>
                    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300">
                      <div className="aspect-[3/4] relative bg-gray-100 overflow-hidden">
                        <Image
                          src={item.cover_url}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                        <div className="absolute top-2 right-2">
                           <span className="bg-black/80 backdrop-blur text-white text-[10px] font-medium px-2 py-1 rounded-md">
                             {item.category}
                           </span>
                        </div>
                      </div>
                      <div className="p-3.5">
                        <h2 className="text-[14px] font-bold text-gray-900 line-clamp-2 leading-snug h-[2.6em] group-hover:text-black transition-colors">
                          {item.title}
                        </h2>
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
                           <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded">查看详情</span>
                           <div className="flex gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                              {item.quark_link && <img src="https://img.icons8.com/color/48/cloud-folder.png" className="w-4 h-4" alt="夸克"/>}
                              {item.baidu_link && <img src="https://img.icons8.com/color/48/baidu.png" className="w-4 h-4" alt="百度"/>}
                           </div>
                        </div>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          )}

          {/* 加载更多触发器 */}
          {!loading && !searchQuery && (
            <div ref={loaderRef} className="py-8 flex justify-center w-full">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> 正在加载更多...
                </div>
              ) : hasMore ? (
                  <div className="h-10 w-full"></div>
              ) : (
                <div className="text-gray-300 text-xs">— 到底了 —</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. 悬浮按钮 */}
      <div className="fixed bottom-8 left-6 z-40 flex flex-col gap-4">
        <Button onClick={handleShare} className="w-12 h-12 rounded-full bg-white text-gray-900 border border-gray-200 shadow-xl hover:scale-110 transition-all p-0"><Share2 className="w-5 h-5" /></Button>
        {mounted && isMobile ? (
           <Button onClick={() => setShowAddToHome(true)} className="w-12 h-12 rounded-full bg-slate-900 text-white shadow-xl shadow-black/20 hover:scale-110 transition-all p-0">
             <Smartphone className="w-5 h-5" />
           </Button>
        ) : (
           <Button onClick={handleBookmark} className="w-12 h-12 rounded-full bg-slate-900 text-white shadow-xl shadow-black/20 hover:scale-110 transition-all p-0"><Bookmark className="w-5 h-5 fill-current" /></Button>
        )}
      </div>

      <Dialog open={showAddToHome} onOpenChange={setShowAddToHome}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogTitle className="text-center text-lg font-bold">添加到手机桌面</DialogTitle>
          <div className="space-y-4 pt-2">
             <div className="flex items-start gap-3">
               <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
               <p className="text-sm text-gray-600">点击浏览器底部/顶部的分享按钮 <Share2 className="w-4 h-4 inline mx-1"/></p>
             </div>
             <div className="flex items-start gap-3">
               <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
               <p className="text-sm text-gray-600">在菜单中找到并点击“添加到主屏幕”或“添加到桌面”</p>
             </div>
             <div className="flex items-start gap-3">
               <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
               <p className="text-sm text-gray-600">点击右上角“添加”，即可像APP一样从桌面打开</p>
             </div>
          </div>
          <div className="flex justify-center pt-4">
             <Button onClick={() => setShowAddToHome(false)} variant="outline" className="rounded-full px-8">学会了</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 资源弹窗 */}
      <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        {selectedResource && (
          <DialogContent className="max-w-md w-[90%] rounded-xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden outline-none bg-white shadow-2xl border-0">
            <DialogClose className="absolute right-3 top-3 z-50 rounded-full bg-black/40 text-white/90 p-1.5 hover:bg-black/60 transition-colors backdrop-blur-sm">
              <X className="w-4 h-4" />
            </DialogClose>

            <div className="p-4 border-b border-gray-100 bg-white z-20 flex-shrink-0 relative">
              <DialogTitle className="text-base font-bold text-center text-gray-900 px-6 leading-snug break-words">
                {selectedResource.title}
              </DialogTitle>
            </div>

            <ScrollArea className="flex-1 min-h-0 bg-gray-50 w-full">
              <div className="w-full">
                <img src={selectedResource.cover_url} alt="详情" className="w-full h-auto block" />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-gray-100 bg-white z-20 flex-shrink-0 space-y-3 pb-6">
              {selectedResource.quark_link && <Button className="w-full bg-slate-900 hover:bg-black text-white font-bold h-11 rounded-xl shadow-md" onClick={() => handleOpenLink(selectedResource.quark_link)}><img src="https://img.icons8.com/color/48/cloud-folder.png" className="w-5 h-5 mr-2" />保存到夸克网盘</Button>}
              <div className="grid grid-cols-2 gap-3">
                {selectedResource.baidu_link && <Button variant="outline" className="w-full h-10 rounded-xl text-gray-700 border-gray-200 hover:bg-gray-50" onClick={() => handleOpenLink(selectedResource.baidu_link!)}>百度网盘</Button>}
                {selectedResource.xunlei_link && <Button variant="outline" className="w-full h-10 rounded-xl text-gray-700 border-gray-200 hover:bg-gray-50" onClick={() => handleOpenLink(selectedResource.xunlei_link!)}>迅雷云盘</Button>}
                {selectedResource.yidong_link && <Button variant="outline" className="w-full h-10 rounded-xl text-gray-700 border-gray-200 hover:bg-gray-50" onClick={() => handleOpenLink(selectedResource.yidong_link!)}>移动云盘</Button>}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* 公告弹窗 */}
      <Dialog open={!!openBannerDialog} onOpenChange={(open) => !open && setOpenBannerDialog(null)}>
        <DialogContent className="max-w-sm rounded-2xl z-50 border-0 shadow-2xl">
          <div className="flex flex-col items-center pt-6 pb-4">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4"><Megaphone className="w-7 h-7 text-black" /></div>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">{openBannerDialog?.title}</DialogTitle>
            <div className="w-full pt-4 px-4 text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-strong:text-black prose-ul:text-left prose-ul:pl-5" dangerouslySetInnerHTML={{ __html: (openBannerDialog as any)?.dialog_content || "" }} />
          </div>
          <div className="flex justify-center pb-8"><Button onClick={() => setOpenBannerDialog(null)} className="rounded-full px-12 h-11 bg-black text-white hover:bg-gray-800 font-bold">朕知道了</Button></div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
