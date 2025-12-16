"use client";

import { useEffect, useState } from "react";
import { X, Copy, ExternalLink, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";

export default function WechatGuide() {
  const [showGuide, setShowGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    // 客户端检测 UA
    const ua = navigator.userAgent.toLowerCase();
    const isWeChat = /micromessenger/i.test(ua);
    const isQQ = /qq\//i.test(ua) || /mqqbrowser/i.test(ua);
    const isMiniProgram = /miniprogram/i.test(ua);
    // 简单的移动端检测
    const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    setIsMobile(mobileCheck);
    
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }

    // 如果是微信/QQ 且不是小程序，则显示遮罩
    if ((isWeChat || isQQ) && !isMiniProgram) {
      setShowGuide(true);
      // 禁止背景滚动
      document.body.style.overflow = "hidden";
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success("链接已复制！请去浏览器粘贴打开");
    } catch (err) {
      // 降级策略
      const textArea = document.createElement("textarea");
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success("链接已复制！");
    }
  };

  if (!showGuide) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      
      {/* 手机端右上角指示箭头 */}
      {isMobile && (
        <div className="absolute top-4 right-8 w-16 h-16 animate-bounce">
          <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
            <path d="M669.5 596.5c-9.8 0-19.1-5.7-23.7-15.5L528.2 284c-5.9-12.7 3.4-27.5 17.5-27.5h16.7c9.8 0 19.1 5.7 23.7 15.5l117.6 297c5.9 12.7-3.4 27.5-17.5 27.5h-16.7z" fill="#ffffff" transform="rotate(30 600 600)"></path>
            <path d="M545.9 334.3l202.9 203.9c10.5 10.5 27.5 10.5 38 0 10.5-10.5 10.5-27.5 0-38l-202.9-203.9c-10.5-10.5-27.5-10.5-38 0-10.5 10.5-10.5 27.5 0 38z" fill="#ffffff"></path>
          </svg>
        </div>
      )}

      <div className="bg-white text-slate-900 p-8 rounded-3xl max-w-sm w-full shadow-2xl relative border border-slate-200">
        <div className="flex flex-col items-center text-center gap-4">
          
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
            {isMobile ? <Smartphone className="w-8 h-8 text-red-500" /> : <Monitor className="w-8 h-8 text-red-500" />}
          </div>

          <h3 className="text-2xl font-black text-slate-900">
            {isMobile ? "请在浏览器打开" : "请在浏览器访问"}
          </h3>
          
          <p className="text-slate-500 font-medium leading-relaxed">
            微信/QQ 内无法直接浏览内容<br/>
            为了您的浏览体验，请按以下步骤操作
          </p>

          {isMobile ? (
            <div className="w-full bg-slate-50 rounded-xl p-4 mt-2 border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                 <div className="bg-slate-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                 <span className="text-sm font-bold">点击右上角菜单 <span className="mx-1 text-lg">···</span></span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="bg-slate-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                 <span className="text-sm font-bold">选择“在浏览器打开”</span>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4 mt-2">
              <div className="bg-slate-100 p-3 rounded-xl break-all text-xs text-slate-500 font-mono border border-slate-200 select-all">
                {currentUrl}
              </div>
              <button 
                onClick={handleCopy}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Copy className="w-4 h-4" /> 一键复制链接
              </button>
              <p className="text-xs text-slate-400">复制后请粘贴到 Chrome / Edge 浏览器访问</p>
            </div>
          )}

          {/* 针对部分安卓机型或特殊环境的备选方案：复制链接 */}
          {isMobile && (
            <div className="w-full pt-4 mt-2 border-t border-slate-100">
               <button 
                onClick={handleCopy}
                className="text-slate-400 text-xs flex items-center justify-center gap-1 hover:text-slate-600 transition-colors w-full py-2"
              >
                <Copy className="w-3 h-3" /> 如果无法跳转，点此复制链接
              </button>
            </div>
          )}

        </div>
      </div>

      <div className="mt-12 text-white/30 text-xs font-medium tracking-widest uppercase">
        Resource Site Premium Protection
      </div>
    </div>
  );
}
