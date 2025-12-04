'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">系统发生严重错误</h2>
          <div className="bg-gray-100 p-4 rounded-lg mb-4 max-w-full overflow-auto text-left">
            <p className="text-sm text-gray-800 font-mono break-all">{error.message}</p>
          </div>
          <button
            className="px-6 py-2 bg-black text-white rounded-xl shadow hover:bg-gray-800 transition-colors"
            onClick={() => reset()}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  )
}
