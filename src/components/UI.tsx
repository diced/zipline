import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppBar from '@material-ui/core/AppBar';
import Box from '@material-ui/core/Box';
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
import PublishIcon from '@material-ui/icons/Publish';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import Divider from '@material-ui/core/Divider';
import copy from 'copy-to-clipboard';
import { LOGOUT, UPDATE_USER } from '../reducer';
import { makeStyles, useTheme, withStyles } from '@material-ui/core/styles';
import { useRouter } from 'next/router';
import { useDispatch } from 'react-redux';
import { store } from '../store';

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
    backgroundColor: theme.palette.type === 'dark' ? '#000' : '#fff',
    color: theme.palette.type !== 'dark' ? '#000' : '#fff',
    [theme.breakpoints.up('sm')]: {
      width: 'calc(100%)',
      marginLeft: drawerWidth
    },
    borderBottom: theme.palette.type === 'dark' ? '1px solid #1f1f1f' : '1px solid #e0e0e0'
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      display: 'none'
    }
  },
  rightButton: {
    marginLeft: 'auto'
  },
  // necessary for content to be below app bar
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(1)
  },
  menuIcon: {
    marginRight: '10px'
  }
}));

const NoFocusMenuItem = withStyles(theme => ({
  root: {
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? '#000' : '#f7f7f7'
    }
  }
}))(MenuItem);

export default function UI({ children }) {
  const classes = useStyles();
  const theme = useTheme();
  const state = store.getState();
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
        router.push('/user/login');
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
      router.push('/user/login');
    }
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

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
          <Box className={classes.rightButton}>
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
          </Box>

          <Menu
            id='menu-appbar'
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
            open={open}
            onClose={() => setAnchorEl(null)}
          >
            <NoFocusMenuItem>
              <Typography variant='h6'>
                {state.user.username}
              </Typography>
            </NoFocusMenuItem>
            <Divider />
            <Link href='/user/manage'>
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
        <Link href='/dash'>
          <ListItem button key='Home' selected={router.pathname === '/dash'}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary='Home' />
          </ListItem>
        </Link>
        <Link href='/dash/statistics'>
          <ListItem
            button
            key='Statistics'
            selected={router.pathname === '/dash/statistics'}
          >
            <ListItemIcon>
              <DataUsageIcon />
            </ListItemIcon>
            <ListItemText primary='Statistics' />
          </ListItem>
        </Link>
        <Link href='/dash/upload'>
          <ListItem
            button
            key='Upload'
            selected={router.pathname === '/dash/upload'}
          >
            <ListItemIcon>
              <PublishIcon />
            </ListItemIcon>
            <ListItemText primary='Upload' />
          </ListItem>
        </Link>
        <Link href='/dash/images'>
          <ListItem
            button
            key='Images'
            selected={router.pathname === '/dash/images'}
          >
            <ListItemIcon>
              <PhotoIcon />
            </ListItemIcon>
            <ListItemText primary='Images' />
          </ListItem>
        </Link>
        <Link href='/dash/urls'>
          <ListItem
            button
            key='URLs'
            selected={router.pathname === '/dash/urls'}
          >
            <ListItemIcon>
              <LinkIcon />
            </ListItemIcon>
            <ListItemText primary='URLs' />
          </ListItem>
        </Link>
        {admin ? (
          <Link href='/dash/users'>
            <ListItem
              button
              key='Users'
              selected={router.pathname === '/dash/users'}
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
          horizontal: 'center'
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
              paper: classes.drawerPaper
            }}
            ModalProps={{
              keepMounted: true // Better open performance on mobile.
            }}
          >
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation='css'>
          <Drawer
            classes={{
              paper: classes.drawerPaper
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
