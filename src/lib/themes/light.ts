import createMuiTheme from '@material-ui/core/styles/createMuiTheme';

const lightTheme = createMuiTheme({
  palette: {
    type: 'light',
    primary: {
      main: '#000000'
    },
    secondary: {
      main: '#4a5bb0'
    },
    background: {
      default: '#fff',
      paper: '#f7f7f7'
    }
  },
  overrides: {
    MuiListItem: {
      root: {
        '&$selected': {
          backgroundColor: '#e0e0e0'
        }
      }
    },
    MuiCard: {
      root: {
        backgroundColor: '#fff'
      }
    },
    MuiButton: {
      root: {
        margin: '132'
      }
    }
  }
});

export default lightTheme;
