import type { Metadata } from 'next';
import { ThemeProvider } from './theme-provider';
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
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
