import type { Metadata } from "next";
import "./globals.css";
// 保留 Toaster 提示框组件
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "严选资源站",
  description: "每日更新精选资源",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* 去掉了 inter.className，直接用默认字体，没有任何影响 */}
      <body suppressHydrationWarning>
        <Script id="wx-redirect" strategy="beforeInteractive">
          {`
            (function() {
              if (typeof window !== 'undefined') {
                var ua = navigator.userAgent.toLowerCase();
                var isWeChat = /micromessenger/i.test(ua);
                var isQQ = /qq\\//i.test(ua) || /mqqbrowser/i.test(ua);
                var isMiniProgram = /miniprogram/i.test(ua);

                // 双重保险：如果是微信/QQ且不是小程序，且当前不在 guide.html 页面
                if ((isWeChat || isQQ) && !isMiniProgram && window.location.pathname !== '/guide.html') {
                  // 强制跳转
                  window.location.href = '/guide.html?target=' + encodeURIComponent(window.location.pathname);
                }
              }
            })();
          `}
        </Script>
        {children}
        <Toaster />
        <Script id="baidu-tongji" strategy="afterInteractive">
          {`
            var _hmt = _hmt || [];
            (function() {
              var hm = document.createElement("script");
              hm.src = "https://hm.baidu.com/hm.js?096f32ede4a43503631c8742989d79ca";
              var s = document.getElementsByTagName("script")[0];
              s.parentNode.insertBefore(hm, s);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
