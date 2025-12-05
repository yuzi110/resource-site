"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface WxOpenGuideProps {
  open: boolean;
  onClose: () => void;
}

export function WxOpenGuide({ open, onClose }: WxOpenGuideProps) {
  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-end pr-8 pt-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* 箭头指向右上角 */}
      <div className="relative mr-4 animate-bounce">
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white rotate-12">
           <path d="M50 90 V 10 M 50 10 L 20 40 M 50 10 L 80 40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* 文字提示 */}
      <div className="bg-white text-black rounded-2xl p-6 mt-4 mr-4 max-w-[280px] shadow-2xl relative">
        <div className="absolute -top-2 right-8 w-4 h-4 bg-white rotate-45"></div>
        <h3 className="font-bold text-lg mb-2">请在浏览器打开</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          由于微信限制，无法直接打开链接。
          <br/>
          <span className="font-bold text-black">1. 点击右上角 ···</span>
          <br/>
          <span className="font-bold text-black">2. 选择“在浏览器打开”</span>
        </p>
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          链接已自动复制，可在浏览器粘贴
        </div>
      </div>

      <div className="mt-20 w-full flex justify-center">
         <button className="border border-white/30 text-white px-6 py-2 rounded-full text-sm hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onClose(); }}>
           我知道了
         </button>
      </div>
    </div>
  );
}
