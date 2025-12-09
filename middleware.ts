import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // 判断是否为微信或QQ内置浏览器
  const isWeChat = /micromessenger/i.test(userAgent);
  const isQQ = /qq\//i.test(userAgent) || /mqqbrowser/i.test(userAgent);

  // 排除小程序环境 (小程序里通常不需要跳出)
  const isMiniProgram = /miniprogram/i.test(userAgent);

  // 如果是微信/QQ，且不是小程序，则“伪装”返回 guide.html
  if ((isWeChat || isQQ) && !isMiniProgram) {
    // 使用 rewrite 而不是 redirect，这样 URL 保持不变，用户无感知
    return NextResponse.rewrite(new URL('/guide.html', request.url));
  }

  // 其他情况（普通浏览器），直接放行，显示正常首页
  return NextResponse.next();
}

// 仅拦截根路径 '/'，避免影响其他页面或静态资源
export const config = {
  matcher: '/',
};
