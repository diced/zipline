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
      default: '#0c051c',
      paper: '#190c36',
    },
  },
  overrides: {
    MuiListItem: {
      root: {
        '&$selected': {
          backgroundColor: '#0c051c80',
        },
      },
    },
    MuiCard: {
      root: {
        backgroundColor: '#100724'
      }
    }
  },
});

export default theme;
