import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 注意：函数名从 middleware 改为 proxy
export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // 1. 识别微信和QQ环境
  const isWeChat = /micromessenger/i.test(userAgent);
  const isQQ = /qq\//i.test(userAgent) || /mqqbrowser/i.test(userAgent);
  const isMiniProgram = /miniprogram/i.test(userAgent);

  // 2. 如果是微信/QQ且不是小程序
  if ((isWeChat || isQQ) && !isMiniProgram) {
    // 3. 核心逻辑：直接重写到 guide.html
    const url = request.nextUrl.clone();
    url.pathname = '/guide.html';
    return NextResponse.rewrite(url);
  }

  // 4. 其他情况直接放行
  return NextResponse.next();
}

// 5. 匹配规则：只拦截首页
export const config = {
  matcher: '/',
};
