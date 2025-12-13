import { Search } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24 relative">
      {/* 1. Header Skeleton */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex justify-between items-center w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
            </div>
            {/* Mobile Button Skeleton */}
            <div className="md:hidden h-9 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex items-center gap-3 w-full md:max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <div className="h-10 bg-gray-100 rounded-xl w-full animate-pulse"></div>
            </div>
            <div className="hidden md:block h-10 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8 mt-2">
        {/* 2. Banner Skeleton */}
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white aspect-[3/1] md:aspect-[4/1] relative animate-pulse">
           <div className="absolute inset-0 bg-gray-200"></div>
        </div>

        {/* 3. Resources Grid Skeleton */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-4">
             <div className="w-1 h-5 bg-black rounded-full"></div>
             <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="group flex flex-col gap-2 cursor-pointer">
                {/* Cover Image Skeleton */}
                <div className="aspect-[3/4] rounded-xl bg-gray-200 animate-pulse relative overflow-hidden">
                   <div className="absolute bottom-2 right-2 w-8 h-4 bg-gray-300 rounded animate-pulse"></div>
                </div>
                {/* Title Skeleton */}
                <div className="space-y-1.5 px-1">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-3 w-10 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
