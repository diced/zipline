import createMuiTheme from '@material-ui/core/styles/createMuiTheme';

const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#fff'
    },
    secondary: {
      main: '#4a5bb0'
    },
    background: {
      default: '#111111',
      paper: '#000000'
    }
  },
  overrides: {
    MuiListItem: {
      root: {
        '&$selected': {
          backgroundColor: '#1F1F1F'
        }
      }
    },
    MuiCard: {
      root: {
        backgroundColor: '#080808'
      }
    }
  }
});

export default darkTheme;
