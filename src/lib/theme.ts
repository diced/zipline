import { createMuiTheme } from '@material-ui/core/styles';
import { red } from '@material-ui/core/colors';

// Create a theme instance.
const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#1a237e',
    },
    secondary: {
      main: '#4a148c',
    },
    background: {
      default: '#091030',
      paper: '#0d1640'
    },
  },
});

export default theme;
