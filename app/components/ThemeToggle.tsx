'use client';

import { useTheme } from '../theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="切换主题"
      title={theme === 'light' ? '切换到夜晚模式' : '切换到白天模式'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
