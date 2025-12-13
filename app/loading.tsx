"use client";

import { useEffect, useState } from "react";
import { Plane, Mountain, ArrowRight, BookOpen } from "lucide-react";

export default function Loading() {
  const [progress, setProgress] = useState(13);
  const [dots, setDots] = useState(".");

  // 模拟进度条
  useEffect(() => {
    // 进度条逻辑：前期快，后期慢，无限逼近 99%
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return 99;
        // 剩余进度的 10% 作为增量，越往后越慢
        const increment = (100 - prev) * 0.1;
        // 保证最小增量，避免看起来卡死，但最大不超过 99
        return Math.min(prev + Math.max(increment, 0.5), 99);
      });
    }, 200);

    // 省略号动画
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);

    return () => {
      clearInterval(timer);
      clearInterval(dotTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-6 text-center">
      {/* 顶部插画区 */}
      <div className="relative w-full max-w-xs h-32 mb-8">
        {/* 地球/地图背景示意 */}
        <div className="absolute inset-x-0 bottom-0 border-b-2 border-gray-200"></div>

        {/* 飞机动画 */}
        <div
          className="absolute bottom-0 text-black transition-all duration-300 ease-out"
          style={{ left: `${progress}%`, transform: 'translate(-50%, 50%)' }}
        >
          <Plane className="w-8 h-8 -rotate-45" />
        </div>

        {/* 装饰图标 */}
        <div className="absolute bottom-0 left-0 -mb-1 text-gray-300">
           <Mountain className="w-12 h-12" />
        </div>
        <div className="absolute bottom-0 right-0 -mb-1 text-gray-300">
           <Mountain className="w-16 h-16" />
        </div>
      </div>

      {/* 进度条 */}
      <div className="w-full max-w-xs bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-black transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="font-mono font-bold text-2xl mb-8">{Math.floor(progress)}%</p>

      {/* 文案区 */}
      <div className="max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-lg font-bold text-gray-900">
          正在搬运资源{dots}
        </h2>

        <div className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-xl text-left space-y-2 border border-gray-100">
          <p>
            🌏 网站正从遥远的<span className="font-bold text-gray-700">阿米利卡</span>搬运过来，要跨过大海、翻过珠峰，第一次加载会有点慢。
          </p>
          <p>
            🍲 但<span className="font-bold text-gray-700">好菜不怕晚</span>，请稍安勿躁。
          </p>
          <hr className="border-gray-200 my-2"/>
          <div className="flex items-start gap-2 text-xs text-gray-400">
             <div className="min-w-[4px] h-[4px] rounded-full bg-black mt-1.5"></div>
             <p>首页展示均为<span className="text-gray-600 font-medium">免费日常资源</span>。</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
             <div className="min-w-[4px] h-[4px] rounded-full bg-red-500 mt-1.5"></div>
             <p>如果你从 <span className="font-bold text-red-500">V</span> 来的，加载完成后可迅速点击右上角的 <span className="inline-flex items-center bg-gray-200 px-1 rounded text-gray-700"><BookOpen className="w-3 h-3 mr-0.5"/>专栏</span> 到达你的目的地。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
