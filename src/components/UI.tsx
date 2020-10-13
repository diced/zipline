import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppBar from '@material-ui/core/AppBar';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Snackbar from '@material-ui/core/Snackbar';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Alert from '@material-ui/lab/Alert';
import HomeIcon from '@material-ui/icons/Home';
import DataUsageIcon from '@material-ui/icons/DataUsage';
import PhotoIcon from '@material-ui/icons/Photo';
import LinkIcon from '@material-ui/icons/Link';
import MenuIcon from '@material-ui/icons/Menu';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import GroupIcon from '@material-ui/icons/Group';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import copy from 'copy-to-clipboard';
import { LOGOUT, UPDATE_USER } from '../lib/reducer';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';

const drawerWidth = 240;

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexGrow: 1,
  },
  drawer: {
    [theme.breakpoints.up('sm')]: {
      width: drawerWidth,
      flexShrink: 0,
    },
    outlineColor: '#fff',
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
  rightButton: {
    marginLeft: 'auto',
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
  menuIcon: {
    marginRight: '10px',
  },
}));

export default function UI({ children }) {
  const classes = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [alertMessage, setAlertMessage] = useState('Copied token!');
  const [tokenOpen, setTokenOpen] = useState(false);
  const [resetToken, setResetToken] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const open = Boolean(anchorEl);

  useEffect(() => {
    (async () => {
      const d = await (await fetch('/api/user')).json();
      if (d.error) {
        dispatch({ type: LOGOUT });
        dispatch({ type: UPDATE_USER, payload: null });
        router.push('/login');
      } else setAdmin(d.administrator);
    })();
  }, []);

  const handleCopyTokenThenClose = async () => {
    const data = await (await fetch('/api/user')).json();
    if (!data.error) {
      copy(data.token);
      setAlertMessage('Copied token!');
      setTokenOpen(false);
      setAlertOpen(true);
      setAnchorEl(null);
    }
  };

  const handleResetTokenThenClose = async () => {
    const data = await (
      await fetch('/api/user/reset-token', { method: 'POST' })
    ).json();
    if (!data.error && data.updated) {
      setAlertMessage('Reset token!');
      setResetToken(false);
      setAlertOpen(true);
    }
  };

  const handleLogout = async () => {
    const data = await (
      await fetch('/api/user/logout', { method: 'POST' })
    ).json();
    if (!data.error && data.clearStore) {
      dispatch({ type: LOGOUT });
      dispatch({ type: UPDATE_USER, payload: null });
      setAlertMessage('Logged out!');
      setAlertOpen(true);
      router.push('/login');
    }
  };

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
          <Typography variant='h6'>Zipline</Typography>
          <IconButton
            aria-label='account of current user'
            aria-controls='menu-appbar'
            aria-haspopup='true'
            onClick={event => setAnchorEl(event.currentTarget)}
            color='inherit'
            className={classes.rightButton}
          >
            <AccountCircleIcon className={classes.rightButton} />
          </IconButton>
          <Menu
            id='menu-appbar'
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={open}
            onClose={() => setAnchorEl(null)}
          >
            <Link href='/manage'>
              <MenuItem onClick={() => setAnchorEl(null)}>
                <AccountCircleIcon className={classes.menuIcon} />
                Manage Profile
              </MenuItem>
            </Link>
            <MenuItem onClick={() => setTokenOpen(true)}>
              <FileCopyIcon className={classes.menuIcon} /> Copy Token
            </MenuItem>
            <MenuItem onClick={() => setResetToken(true)}>
              <RotateLeftIcon className={classes.menuIcon} /> Reset Token
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToAppIcon className={classes.menuIcon} /> Logout
            </MenuItem>
          </Menu>
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
          <ListItem
            button
            key='Statistics'
            selected={router.pathname === '/statistics'}
          >
            <ListItemIcon>
              <DataUsageIcon />
            </ListItemIcon>
            <ListItemText primary='Statistics' />
          </ListItem>
        </Link>
        <Link href='/images'>
          <ListItem
            button
            key='Images'
            selected={router.pathname === '/images'}
          >
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
        {admin ? (
          <Link href='/users'>
            <ListItem
              button
              key='Users'
              selected={router.pathname === '/users'}
            >
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <ListItemText primary='Users' />
            </ListItem>
          </Link>
        ) : null}
      </List>
    </div>
  );

  const container =
    typeof window !== 'undefined' ? () => window.document.body : undefined;

  return (
    <div className={classes.root}>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        open={alertOpen}
        autoHideDuration={6000}
        onClose={() => setAlertOpen(false)}
      >
        <Alert severity='success' variant='filled'>
          {alertMessage}
        </Alert>
      </Snackbar>
      <Dialog
        open={tokenOpen}
        onClose={() => setTokenOpen(false)}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
      >
        <DialogTitle id='alert-dialog-title'>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>
            This token is used to upload images to Zipline, and should not be
            shared!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTokenOpen(false)} color='primary'>
            Close
          </Button>
          <Button onClick={handleCopyTokenThenClose} color='primary' autoFocus>
            Yes, copy!
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={resetToken}
        onClose={() => setResetToken(false)}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'
      >
        <DialogTitle id='alert-dialog-title'>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>
            This token is used to upload images to Zipline, resetting your token
            will cause any uploading actions to not work until you update them
            your self.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetToken(false)} color='primary'>
            Close
          </Button>
          <Button onClick={handleResetTokenThenClose} color='primary' autoFocus>
            Yes, reset!
          </Button>
        </DialogActions>
      </Dialog>
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
          <Typography variant='h6'>Zipline</Typography>
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
