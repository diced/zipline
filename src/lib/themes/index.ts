import { createTheme as muiCreateTheme } from '@material-ui/core/styles';

export interface ThemeOptions {
  type: 'dark' | 'light';
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  info: string;
  border: string;
  background: ThemeOptionsBackground;
}

export interface ThemeOptionsBackground {
  main: string;
  paper: string;
}

export default function createTheme(o: ThemeOptions) {
  return muiCreateTheme({
    palette: {
      mode: o.type,
      primary: {
        main: o.primary,
      },
      secondary: {
        main: o.secondary,
      },
      background: {
        default: o.background.main,
        paper: o.background.paper,
      },
      error: {
        main: o.error,
      },
      warning: {
        main: o.warning,
      },
      info: {
        main: o.info,
      },
      divider: o.border,
    },
    components: {
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: o.border
          }
        }
      }
    }
  });
}