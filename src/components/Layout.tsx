import React, { useState } from 'react';
import Link from 'next/link';
import useFetch from '../lib/hooks/useFetch';

import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  AccountCircle as AccountIcon,
  Image as ImageIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Autorenew as ResetIcon,
  Logout as LogoutIcon,
  PeopleAlt as UsersIcon
} from '@material-ui/icons';
import copy from 'copy-to-clipboard';
import Backdrop from './Backdrop';

const items = [
  {
    icon: <HomeIcon />,
    text: 'Home',
    link: '/dashboard'
  },
  {
    icon: <ImageIcon />,
    text: 'Images',
    link: '/dashboard/images'
  },
  {
    icon: <UploadIcon />,
    text: 'Upload',
    link: '/dashboard/upload'
  }
];

const drawerWidth = 240;

function CopyTokenDialog({ open, setOpen, token }) {
  const handleCopyToken = () => {
    copy(token);
    setOpen(false);
  };

  return (
    <div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
      >
        <DialogTitle id='copy-dialog-title'>
          Copy Token
        </DialogTitle>
        <DialogContent>
          <DialogContentText id='copy-dialog-description'>
              Make sure you don&apos;t share this token with anyone as they will be able to upload images on your behalf.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color='inherit' autoFocus>Cancel</Button>
          <Button onClick={handleCopyToken} color='inherit'>
              Copy
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function ResetTokenDialog({ open, setOpen, setToken }) {
  const handleResetToken = async () => {
    const a = await useFetch('/api/user/token', 'PATCH');
    if (a.success) setToken(a.success);
    setOpen(false);
  };
  
  return (
    <div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
      >
        <DialogTitle id='reset-dialog-title'>
          Reset Token
        </DialogTitle>
        <DialogContent>
          <DialogContentText id='reset-dialog-description'>
            Once you reset your token, you will have to update any uploaders to use this new token.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color='inherit' autoFocus>Cancel</Button>
          <Button onClick={handleResetToken} color='inherit'>
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default function Layout({ children, user, loading, noPaper }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [token, setToken] = useState(user?.token);

  const open = Boolean(anchorEl);
  const handleClick = e => setAnchorEl(e.currentTarget);
  const handleClose = (cmd: 'copy' | 'reset') => () => {
    switch (cmd) {
    case 'copy':
      setCopyOpen(true);
      break;
    case 'reset':
      setResetOpen(true);
      break;
    }
    setAnchorEl(null);
  };

  const drawer = (
    <div>
      <CopyTokenDialog open={copyOpen} setOpen={setCopyOpen} token={token} />
      <ResetTokenDialog open={resetOpen} setOpen={setResetOpen} setToken={setToken} />
      <Toolbar
        sx={{
          width: { xs: drawerWidth }
        }}
      >
        <AppBar
          position='fixed'
          elevation={0}
          sx={{
            borderBottom: 1,
            borderBottomColor: t => t.palette.divider,
            display: { xs: 'none', sm: 'block' }
          }}
        >
          <Toolbar>
            <IconButton
              color='inherit'
              aria-label='open drawer'
              edge='start'
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography 
              variant='h5'
              noWrap
              component='div'
            >
              Zipline
            </Typography>
            {user && (
              <Box sx={{ marginLeft: 'auto' }}>
                <Button
                  color='inherit'
                  aria-expanded={open ? 'true' : undefined}
                  onClick={handleClick}
                >
                  <AccountIcon />
                </Button>
                <Menu
                  id='zipline-user-menu'
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose(null)}
                  MenuListProps={{
                    'aria-labelledby': 'basic-button',
                  }}
                >
                  <MenuItem disableRipple>
                    <Typography variant='h5'>
                      <b>{user.username}</b>
                    </Typography>
                  </MenuItem>
                  <Divider />
                  <Link href='/dashboard/manage'>
                    <a style={{ color: 'white', textDecoration: 'none' }}>
                      <MenuItem onClick={handleClose(null)}>
                        <AccountIcon sx={{ mr: 2 }} /> Manage Account
                      </MenuItem>
                    </a>
                  </Link>
                  <MenuItem onClick={handleClose('copy')}>
                    <CopyIcon sx={{ mr: 2 }} /> Copy Token
                  </MenuItem>
                  <MenuItem onClick={handleClose('reset')}>
                    <ResetIcon sx={{ mr: 2 }} /> Reset Token
                  </MenuItem>
                  <Link href='/auth/logout'>
                    <a style={{ color: 'white', textDecoration: 'none' }}>
                      <MenuItem onClick={handleClose(null)}>
                        <LogoutIcon sx={{ mr: 2 }} /> Logout
                      </MenuItem>
                    </a>
                  </Link>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </AppBar>
      </Toolbar>
      <Divider />
      <List>
        {items.map((item, i) => (
          <Link key={i} href={item.link}>
            <a href={item.link} style={{ color: 'white', textDecoration: 'none' }}>
              <ListItem button>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            </a>
          </Link>
        ))}
        {user && user.administrator && (
          <Link href='/dashboard/users' passHref>
            <a style={{ color: 'white', textDecoration: 'none' }}>
              <ListItem button>
                <ListItemIcon><UsersIcon /></ListItemIcon>
                <ListItemText primary='Users' />
              </ListItem>
            </a>
          </Link>
        )}
      </List>
      
    </div>
  );

  const container = typeof window !== 'undefined' ? window.document.body : undefined;

  return (
    <Box sx={{ display: 'flex' }}>
      <Backdrop open={loading} />

      <AppBar
        position='fixed'
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` }
        }}
      >
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='open drawer'
            edge='start'
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant='h5'
            noWrap
            component='div'
            sx={{ display: { sm: 'none' } }}
          >
            Zipline
          </Typography>
          {user && (
            <Box sx={{ marginLeft: 'auto' }}>
              <Button
                color='inherit'
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
              >
                <AccountIcon />
              </Button>
              <Menu
                id='zipline-user-menu'
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose(null)}
                MenuListProps={{
                  'aria-labelledby': 'basic-button',
                }}
              >
                <MenuItem disableRipple>
                  <Typography variant='h5'>
                    <b>{user.username}</b>
                  </Typography>
                </MenuItem>
                <Divider />
                <Link href='/dash/manage'>
                  <a style={{ color: 'white', textDecoration: 'none' }}>
                    <MenuItem onClick={handleClose(null)}>
                      <AccountIcon sx={{ mr: 2 }} /> Manage Account
                    </MenuItem>
                  </a>
                </Link>
                <MenuItem onClick={handleClose('copy')}>
                  <CopyIcon sx={{ mr: 2 }} /> Copy Token
                </MenuItem>
                <MenuItem onClick={handleClose('reset')}>
                  <ResetIcon sx={{ mr: 2 }} /> Reset Token
                </MenuItem>
                <Link href='/auth/logout'>
                  <a style={{ color: 'white', textDecoration: 'none' }}>
                    <MenuItem onClick={handleClose(null)}>
                      <LogoutIcon sx={{ mr: 2 }} /> Logout
                    </MenuItem>
                  </a>
                </Link>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component='nav'
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 }
        }}
      >
        <Drawer
          container={container}
          variant='temporary'
          onClose={() => setMobileOpen(false)}
          open={mobileOpen}
          elevation={0}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '* .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant='permanent'
          sx={{
            display: { xs: 'none', sm: 'block' },
            '* .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component='main' sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {user && noPaper ? children : (
          <Paper elevation={0} sx={{ p: 2 }} variant='outlined'>
            {children}
          </Paper>
        )}
      </Box>
    </Box>
  );
}
