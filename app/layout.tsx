import type { Metadata } from "next";
import "./globals.css";
// 保留 Toaster 提示框组件
import { Toaster } from "@/components/ui/sonner";

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
    <html lang="en">
      {/* 去掉了 inter.className，直接用默认字体，没有任何影响 */}
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
