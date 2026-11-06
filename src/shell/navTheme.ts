import {
  DefaultTheme,
  DarkTheme,
  type Theme,
} from '@react-navigation/native';
import { lightColors, darkColors, fontFamily } from '../theme';

export function buildNavTheme(isDark: boolean): Theme {
  const c = isDark ? darkColors : lightColors;
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: c.bg,
      card: c.bg,
      text: c.fg,
      border: c.hairline,
      primary: c.fg,
    },
    fonts: {
      regular: { fontFamily: fontFamily.sans, fontWeight: '400' },
      medium: { fontFamily: fontFamily.sansMedium, fontWeight: '500' },
      bold: { fontFamily: fontFamily.sansSemibold, fontWeight: '600' },
      heavy: { fontFamily: fontFamily.sansSemibold, fontWeight: '600' },
    },
  };
}
