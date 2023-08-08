// @ts-nocheck
// from mantine https://github.com/mantinedev/mantine/blob/master/src/mantine-styles/src/theme/utils/merge-theme/merge-theme.ts
// was not included in the dist so we are using it here instead

import { MantineThemeBase, MantineThemeOverride, getBreakpointValue } from '@mantine/core';

export function mergeTheme(
  currentTheme: MantineThemeBase,
  themeOverride?: MantineThemeOverride
): MantineThemeBase {
  if (!themeOverride) {
    return currentTheme;
  }

  const result: MantineThemeBase = Object.keys(currentTheme).reduce((acc, key) => {
    if (key === 'headings' && themeOverride.headings) {
      const sizes = themeOverride.headings.sizes
        ? Object.keys(currentTheme.headings.sizes).reduce((headingsAcc, h) => {
            // eslint-disable-next-line no-param-reassign
            headingsAcc[h] = {
              ...currentTheme.headings.sizes[h],
              ...themeOverride.headings.sizes[h],
            };
            return headingsAcc;
          }, {} as MantineThemeBase['headings']['sizes'])
        : currentTheme.headings.sizes;
      return {
        ...acc,
        headings: {
          ...currentTheme.headings,
          ...themeOverride.headings,
          sizes,
        },
      };
    }

    if (key === 'breakpoints' && themeOverride.breakpoints) {
      const mergedBreakpoints = { ...currentTheme.breakpoints, ...themeOverride.breakpoints };

      return {
        ...acc,
        breakpoints: Object.fromEntries(
          Object.entries(mergedBreakpoints).sort(
            (a, b) => getBreakpointValue(a[1]) - getBreakpointValue(b[1])
          )
        ),
      };
    }

    acc[key] =
      typeof themeOverride[key] === 'object'
        ? { ...currentTheme[key], ...themeOverride[key] }
        : typeof themeOverride[key] === 'number' ||
          typeof themeOverride[key] === 'boolean' ||
          typeof themeOverride[key] === 'function'
        ? themeOverride[key]
        : themeOverride[key] || currentTheme[key];
    return acc;
  }, {} as MantineThemeBase);

  if (themeOverride?.fontFamily && !themeOverride?.headings?.fontFamily) {
    result.headings.fontFamily = themeOverride.fontFamily as string;
  }

  if (!(result.primaryColor in result.colors)) {
    throw new Error(
      'MantineProvider: Invalid theme.primaryColor, it accepts only key of theme.colors, learn more – https://mantine.dev/theming/colors/#primary-color'
    );
  }

  return result;
}
