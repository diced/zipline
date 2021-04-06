import createMuiTheme from '@material-ui/core/styles/createMuiTheme';

const purpleDarkTheme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#fff'
    },
    secondary: {
      main: '#4a5bb0'
    },
    background: {
      default: '#240f2e',
      paper: '#2b0e38'
    }
  },
  overrides: {
    MuiListItem: {
      root: {
        '&$selected': {
          backgroundColor: '#461c59'
        }
      }
    },
    MuiAppBar: {
      root: {
        borderBottom: '#1f1f1f',
        backgroundColor: '#5b2b70'
      }
    },
    MuiPaper: {
      outlined: {
        borderColor: '#ffffff'
      }
    },
    MuiCard: {
      root: {
        backgroundColor: '#182f52'
      }
    },
    MuiButton: {
      root: {
        margin: '1320000'
      }
    }
  }
});

export default purpleDarkTheme;
