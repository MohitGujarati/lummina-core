import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from './themes';

// Flatten { bg: { app: '#xxx' } } → [['--color-bg-app', '#xxx'], ...]
function flattenTheme(obj, prefix = '--color') {
  return Object.entries(obj).flatMap(([key, val]) => {
    const name = `${prefix}-${key}`;
    return typeof val === 'object' && !Array.isArray(val)
      ? flattenTheme(val, name)
      : [[name, val]];
  });
}

const GlobalStyles = () => {
  const { theme } = useTheme();

  useEffect(() => {
    const active = theme === 'dark' ? darkTheme : lightTheme;
    const vars = flattenTheme(active);
    const root = document.documentElement;
    vars.forEach(([name, value]) => root.style.setProperty(name, value));
  }, [theme]);

  return null;
};

export default GlobalStyles;
