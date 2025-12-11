import type { Metadata } from "next";
import "./globals.css";
// 保留 Toaster 提示框组件
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "严选资源站 - 日韩女优介绍 | 高清资源合集 | 每日更新",
  description: "专注日韩女优人物介绍，提供最新、最全的高清资源合集转存。严选资源，拒绝滥竽充数。LSP的专属百科全书。",
  keywords: ["严选资源", "女优介绍", "资源合集", "夸克网盘资源", "高清图片", "日韩明星"],
  verification: {
    google: "syxWq0D6Ib0Q7nD7X3z4S3NRMoMp8UBfnUX_luh9fbs",
  },
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
        {/*
            🛡️ 微信/QQ 环境保护机制
            即使直接访问域名，也会被强制跳转到 guide.html
            配合服务端 Cache-Control: no-store 使用，效果最佳
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var ua = navigator.userAgent.toLowerCase();
                var isWeChat = /micromessenger/i.test(ua);
                var isQQ = /qq\\//i.test(ua) || /mqqbrowser/i.test(ua);
                var isMiniProgram = /miniprogram/i.test(ua);

                // 仅针对微信/QQ环境，且非小程序，且当前不在 guide.html
                if ((isWeChat || isQQ) && !isMiniProgram && window.location.pathname.indexOf('/guide.html') === -1) {
                   // 使用 replace 避免历史记录堆叠，体验更顺滑
                   var target = window.location.pathname + window.location.search;
                   window.location.replace('/guide.html?target=' + encodeURIComponent(target));
                }
              })();
            `,
          }}
        />
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
