import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#2f2c8a',
    },
    secondary: {
      main: '#4a148c',
    },
    background: {
      default: '#000000',
      paper: '#000000',
    },
  },
  overrides: {
    MuiListItem: {
      root: {
        '&$selected': {
          backgroundColor: '#1f1f1f',
        },
      },
    },
    MuiPaper: {
      root: {

      }
    },
    MuiCard: {
      root: {
        backgroundColor: '#100724',
      },
    },
  },
});

export default theme;
