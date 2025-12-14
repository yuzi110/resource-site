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
    <div className="fixed inset-0 z-[9999] bg-[#333333] flex flex-col items-center pt-20 px-6">
      {/* 纯色背景 + 居中提示，最大程度模拟系统原生拦截页 */}
      
      <div className="bg-white rounded-full p-4 mb-6 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
           <circle cx="12" cy="12" r="10"></circle>
           <line x1="12" y1="8" x2="12" y2="12"></line>
           <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">已停止访问该网页</h2>
      <p className="text-gray-300 text-sm text-center max-w-xs leading-relaxed">
        如需继续访问，请点击右上角 <span className="font-bold text-white">···</span> <br/>
        选择 <span className="text-blue-400 font-bold">在浏览器打开</span>
      </p>

      {/* 箭头指示 */}
      <div className="absolute top-4 right-6 animate-bounce opacity-80">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32.5 12.5L25 5M32.5 12.5L25 20M32.5 12.5H15C10.8579 12.5 7.5 15.8579 7.5 20V25" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
