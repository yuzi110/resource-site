import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 Skeleton */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 text-gray-400">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* 分类 Filter Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-16 bg-gray-200 rounded-full shrink-0 animate-pulse"></div>
          ))}
        </div>

        {/* 文章列表 Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex h-28">
              {/* 左侧封面图 */}
              <div className="w-1/3 min-w-[120px] bg-gray-200 animate-pulse"></div>
              
              {/* 右侧内容 */}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                   <div className="flex gap-2">
                     <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                     <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                   </div>
                   <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
