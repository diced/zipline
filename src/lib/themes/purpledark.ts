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
      default: '#0b1524',
      paper: '#0a1930'
    }
  },
  overrides: {
    MuiListItem: {
      root: {
        '&$selected': {
          backgroundColor: '#182f52'
        }
      }
    },
    MuiAppBar: {
      root: {
        borderBottom: '#1f1f1f',
        backgroundColor: '#162946'
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
