'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 自动重试机制：如果是 ChunkLoadError，通常刷新页面可以解决
    // 这种错误通常发生在发布新版本后，用户还在浏览旧版本页面，点击跳转时请求了旧的 chunk 哈希
    if (error.message && (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError'))) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="text-xl font-bold text-gray-900 mb-2">正在更新资源...</h2>
      <p className="text-gray-500 text-sm mb-6">为了提供更好的体验，我们需要刷新一下页面。</p>
      
      {/* 隐藏具体错误堆栈，普通用户不需要看这个 */}
      <div className="hidden">
        <p>{error.message}</p>
      </div>

      <button
        className="px-6 py-2 bg-black text-white rounded-xl shadow hover:bg-gray-800 transition-colors"
        onClick={() => {
            // 对于 Chunk 错误，reset() 可能没用，强制刷新最稳
            if (error.message.includes('chunk')) {
                window.location.reload();
            } else {
                reset();
            }
        }}
      >
        立即刷新
      </button>
    </div>
  )
}
