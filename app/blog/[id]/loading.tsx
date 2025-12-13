import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BlogDetailLoading() {
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 顶部导航 Skeleton */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/blog" className="p-1 -ml-1 text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-8"></div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* 封面图 Skeleton */}
        <div className="w-full aspect-video bg-gray-200 animate-pulse"></div>

        <div className="p-5 space-y-6">
          {/* 标题 Skeleton */}
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          </div>

          {/* Meta Skeleton */}
          <div className="flex items-center gap-4 py-2 border-b border-gray-100">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* 内容 Skeleton */}
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded w-full animate-pulse my-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
