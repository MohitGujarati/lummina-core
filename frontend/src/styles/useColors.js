import { useTheme } from '../context/ThemeContext';
import { lightTheme, darkTheme } from './themes';

const useColors = () => {
  const { theme } = useTheme();
  return theme === 'dark' ? darkTheme : lightTheme;
};

export default useColors;
