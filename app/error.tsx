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
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="text-xl font-bold text-red-600 mb-4">应用发生错误</h2>
      <div className="bg-gray-100 p-4 rounded-lg mb-4 max-w-full overflow-auto text-left">
        <p className="text-sm text-gray-800 font-mono break-all">{error.message}</p>
        {error.digest && <p className="text-xs text-gray-500 mt-2">错误代码: {error.digest}</p>}
      </div>
      <button
        className="px-6 py-2 bg-black text-white rounded-xl shadow hover:bg-gray-800 transition-colors"
        onClick={() => reset()}
      >
        尝试恢复
      </button>
    </div>
  )
}
