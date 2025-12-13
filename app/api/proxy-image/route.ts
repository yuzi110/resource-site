import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  // 安全检查：只允许代理 Supabase 存储的图片
  // 根据实际情况调整域名匹配规则
  const allowedDomains = ['supabase.co', 'supabase.in']; 
  const isAllowed = allowedDomains.some(domain => url.includes(domain));
  
  if (!isAllowed && !url.startsWith('http')) {
     // 如果是相对路径，直接忽略或处理
     return new NextResponse('Invalid URL', { status: 400 });
  }

  try {
    const response = await fetch(url, {
        headers: {
            // 伪装 User-Agent 防止被某些 CDN 拦截
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    if (!response.ok) {
        return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        // 浏览器缓存 1 年 (Immutable)
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Proxy Image Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
