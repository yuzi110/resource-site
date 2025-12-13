"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function WechatGuide() {
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // 客户端检测 UA
    const ua = navigator.userAgent.toLowerCase();
    const isWeChat = /micromessenger/i.test(ua);
    const isQQ = /qq\//i.test(ua) || /mqqbrowser/i.test(ua);
    const isMiniProgram = /miniprogram/i.test(ua);

    // 如果是微信/QQ 且不是小程序，则显示遮罩
    if ((isWeChat || isQQ) && !isMiniProgram) {
      setShowGuide(true);
      // 禁止背景滚动
      document.body.style.overflow = "hidden";
    }
  }, []);

  if (!showGuide) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center pt-10 px-6 animate-in fade-in duration-300">
      {/* 箭头指示 */}
      <div className="absolute top-4 right-8 w-16 h-16 animate-bounce">
        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
          <path d="M669.5 596.5c-9.8 0-19.1-5.7-23.7-15.5L528.2 284c-5.9-12.7 3.4-27.5 17.5-27.5h16.7c9.8 0 19.1 5.7 23.7 15.5l117.6 297c5.9 12.7-3.4 27.5-17.5 27.5h-16.7z" fill="#ffffff" transform="rotate(30 600 600)"></path>
          <path d="M545.9 334.3l202.9 203.9c10.5 10.5 27.5 10.5 38 0 10.5-10.5 10.5-27.5 0-38l-202.9-203.9c-10.5-10.5-27.5-10.5-38 0-10.5 10.5-10.5 27.5 0 38z" fill="#ffffff"></path>
        </svg>
      </div>

      <div className="mt-20 bg-white text-gray-900 p-6 rounded-2xl max-w-xs w-full shadow-2xl relative">
        <div className="absolute -top-3 right-8 w-6 h-6 bg-white rotate-45 transform"></div>
        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
          请在浏览器打开
        </h3>
        <p className="text-gray-600 leading-relaxed text-sm mb-4">
          点击右上角菜单 <span className="font-bold">···</span>
        </p>
        <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-xl">
           <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</div>
           <span className="text-sm font-medium">选择“在浏览器打开”</span>
        </div>
      </div>

      <div className="mt-10 text-white/50 text-sm">
        Resource Site Premium
      </div>
    </div>
  );
}
