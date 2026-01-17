import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '漫画网站',
  description: '在线阅读漫画',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
