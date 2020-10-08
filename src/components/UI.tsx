import React from 'react';
import Link from 'next/link';
import AppBar from '@material-ui/core/AppBar';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import HomeIcon from '@material-ui/icons/Home';
import DataUsageIcon from '@material-ui/icons/DataUsage';
import PhotoIcon from '@material-ui/icons/Photo';
import LinkIcon from '@material-ui/icons/Link';
import MenuIcon from '@material-ui/icons/Menu';
import ProfileIcon from '@material-ui/icons/AccountCircle';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { useRouter } from 'next/router';

const drawerWidth = 240;

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexGrow: 1
  },
  drawer: {
    [theme.breakpoints.up('sm')]: {
      width: drawerWidth,
      flexShrink: 0
    },
    outlineColor: '#fff'
  },
  appBar: {
    display: 'flex',
    [theme.breakpoints.up('sm')]: {
      width: 'calc(100%)',
      marginLeft: drawerWidth,
    },
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
  },
}));

export default function UI({ children }) {
  const classes = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar />
      <AppBar position='fixed' className={classes.appBar} elevation={0}>
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='open drawer'
            edge='start'
            onClick={handleDrawerToggle}
            className={classes.menuButton}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant='h6'>
            Zipline
          </Typography>
          <Typography variant='h6' style={{ float: 'right' }}>
            Zipline
          </Typography>
        </Toolbar>
      </AppBar>

      <List>
        <Link href='/'>
          <ListItem button key='Home' selected={router.pathname === '/'}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary='Home' />
          </ListItem>
        </Link>
        <Link href='/statistics'>
          <ListItem button key='Statistics' selected={router.pathname === '/statistics'}>
            <ListItemIcon>
              <DataUsageIcon />
            </ListItemIcon>
            <ListItemText primary='Statistics' />
          </ListItem>
        </Link>
        <Link href='/images'>
          <ListItem button key='Images' selected={router.pathname === '/images'}>
            <ListItemIcon>
              <PhotoIcon />
            </ListItemIcon>
            <ListItemText primary='Images' />
          </ListItem>
        </Link>
        <Link href='/urls'>
          <ListItem button key='URLs' selected={router.pathname === '/urls'}>
            <ListItemIcon>
              <LinkIcon />
            </ListItemIcon>
            <ListItemText primary='URLs' />
          </ListItem>
        </Link>
      </List>
    </div >
  );

  const container =
    typeof window !== 'undefined' ? () => window.document.body : undefined;

  return (
    <div className={classes.root}>
      <AppBar position='fixed' className={classes.appBar} elevation={0}>
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='open drawer'
            edge='start'
            onClick={handleDrawerToggle}
            className={classes.menuButton}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant='h6'>
            Zipline
          </Typography>
          <IconButton style={{ float: 'right' }}>
            <ProfileIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <nav className={classes.drawer} aria-label='mailbox folders'>
        <Hidden smUp implementation='css'>
          <Drawer
            container={container}
            variant='temporary'
            anchor={theme.direction === 'rtl' ? 'right' : 'left'}
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{
              paper: classes.drawerPaper,
            }}
            style={{ border: 'none' }}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
          >
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation='css'>
          <Drawer
            classes={{
              paper: classes.drawerPaper,
            }}
            PaperProps={{ style: { border: 'none' } }}
            variant='permanent'
            open
          >
            {drawer}
          </Drawer>
        </Hidden>
      </nav>

      <main className={classes.content}>
        <div className={classes.toolbar} />
        {children}
      </main>
    </div>
  );
}
