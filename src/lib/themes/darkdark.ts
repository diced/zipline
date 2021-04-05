import createMuiTheme from '@material-ui/core/styles/createMuiTheme';

const darkdarkTheme = createMuiTheme({
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
    MuiAppBar: {
      root: {
        borderBottom: '#1f1f1f',
        backgroundColor: '#000000'
      }
    },
    MuiCard: {
      root: {
        backgroundColor: '#080808'
      }
    },
    MuiButton: {
      root: {
        margin: '1320000'
      }
    }
  }
});

export default darkdarkTheme;
