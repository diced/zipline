import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#000',
    },
    secondary: {
      main: '#4a148c',
    },
    background: {
      default: '#030303',
      paper: '#000000',
    },
  },
  overrides: {
    MuiListItem: {
      root: {
        '&$selected': {
          backgroundColor: '#1F1F1F',
        },
      },
    },
    MuiCard: {
      root: {
        backgroundColor: '#080808',
      },
    },
  },
});

export default theme;
