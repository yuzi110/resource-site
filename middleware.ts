import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // 1. 识别微信和QQ环境
  const isWeChat = /micromessenger/i.test(userAgent);
  const isQQ = /qq\//i.test(userAgent) || /mqqbrowser/i.test(userAgent);
  const isMiniProgram = /miniprogram/i.test(userAgent);

  // 2. 如果是微信/QQ且不是小程序，且当前不在 guide.html
  if ((isWeChat || isQQ) && !isMiniProgram && !request.nextUrl.pathname.startsWith('/guide.html')) {
    // 3. 构建跳转 URL，带上 target 参数
    const url = request.nextUrl.clone();
    // 保存原始路径作为 target 参数
    const target = url.pathname + url.search;
    url.pathname = '/guide.html';
    url.searchParams.set('target', target);

    // 4. 重定向
    return NextResponse.redirect(url);
  }

  // 5. 其他情况直接放行
  return NextResponse.next();
}

// 6. 匹配规则
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了:
     * 1. /api/ (API 路由)
     * 2. /_next/ (Next.js 内部资源)
     * 3. /_static/ (静态文件)
     * 4. 常见静态资源后缀 (jpg, png, svg, ico 等)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
