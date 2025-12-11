export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-gray-800">
      {/* 顶部导航骨架 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
            <div className="h-6 w-24 bg-gray-800 rounded animate-pulse hidden sm:block" />
          </div>

          {/* 搜索框 */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="h-10 w-full bg-gray-800 rounded-full animate-pulse" />
          </div>

          {/* 右侧按钮 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <main className="container mx-auto px-4 pt-24 pb-20">

        {/* 轮播图骨架 */}
        <div className="w-full aspect-[21/9] sm:aspect-[3/1] bg-gray-800 rounded-xl mb-8 animate-pulse" />

        {/* 资源列表标题 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
        </div>

        {/* 资源卡片网格 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 生成 12 个卡片骨架 */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-gray-900/50 rounded-xl overflow-hidden border border-white/5">
              {/* 封面图 */}
              <div className="aspect-[3/4] bg-gray-800 animate-pulse" />

              {/* 内容区 */}
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 bg-gray-800 rounded animate-pulse" />
                <div className="flex justify-between items-center pt-2">
                   <div className="h-5 w-16 bg-gray-800 rounded-full animate-pulse" />
                   <div className="h-8 w-20 bg-gray-800 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
