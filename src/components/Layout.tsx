import React, { useState } from 'react';
import Link from 'next/link';

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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  AccountCircle as AccountIcon,
  Folder as FolderIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Autorenew as ResetIcon,
  Logout as LogoutIcon,
  PeopleAlt as UsersIcon,
  Brush as BrushIcon,
  Link as URLIcon,
} from '@mui/icons-material';
import copy from 'copy-to-clipboard';
import Backdrop from './Backdrop';
import { friendlyThemeName, themes } from 'components/Theming';
import Select from 'components/input/Select';
import { useRouter } from 'next/router';
import { useStoreDispatch } from 'lib/redux/store';
import { updateUser } from 'lib/redux/reducers/user';
import useFetch from 'hooks/useFetch';

const items = [
  {
    icon: <HomeIcon />,
    text: 'Home',
    link: '/dashboard',
  },
  {
    icon: <FolderIcon />,
    text: 'Files',
    link: '/dashboard/files',
  },
  {
    icon: <URLIcon />,
    text: 'URLs',
    link: '/dashboard/urls',
  },
  {
    icon: <UploadIcon />,
    text: 'Upload',
    link: '/dashboard/upload',
  },
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
              Make sure you don&apos;t share this token with anyone as they will be able to upload files on your behalf.
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
  const [systemTheme, setSystemTheme] = useState(user.systemTheme || 'dark_blue');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [token, setToken] = useState(user?.token);
  const router = useRouter();
  const dispatch = useStoreDispatch();

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

  const handleUpdateTheme = async event => {
    const newUser = await useFetch('/api/user', 'PATCH', {
      systemTheme: event.target.value || 'dark_blue',
    });

    setSystemTheme(newUser.systemTheme);
    dispatch(updateUser(newUser));

    router.replace(router.pathname);
  };

  const drawer = (
    <div>
      <CopyTokenDialog open={copyOpen} setOpen={setCopyOpen} token={token} />
      <ResetTokenDialog open={resetOpen} setOpen={setResetOpen} setToken={setToken} />
      <Toolbar
        sx={{
          width: { xs: drawerWidth },
        }}
      >
        <AppBar
          position='fixed'
          elevation={0}
          sx={{
            borderBottom: 1,
            borderBottomColor: t => t.palette.divider,
            display: { xs: 'none', sm: 'block' },
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
                  <Link href='/dashboard/manage' passHref>
                    <MenuItem onClick={handleClose(null)}>
                      <AccountIcon sx={{ mr: 2 }} /> Manage Account
                    </MenuItem>
                  </Link>
                  <MenuItem onClick={handleClose('copy')}>
                    <CopyIcon sx={{ mr: 2 }} /> Copy Token
                  </MenuItem>
                  <MenuItem onClick={handleClose('reset')}>
                    <ResetIcon sx={{ mr: 2 }} /> Reset Token
                  </MenuItem>
                  <Link href='/auth/logout' passHref>
                    <MenuItem onClick={handleClose(null)}>
                      <LogoutIcon sx={{ mr: 2 }} /> Logout
                    </MenuItem>
                  </Link>
                  <MenuItem>
                    <BrushIcon sx={{ mr: 2 }} />
                    <Select
                      variant='standard'
                      label='Theme'
                      value={systemTheme}
                      onChange={handleUpdateTheme}
                      fullWidth
                    >
                      {Object.keys(themes).map(t => (
                        <MenuItem value={t} key={t}>
                          {friendlyThemeName[t]}
                        </MenuItem>
                      ))}
                    </Select>
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </AppBar>
      </Toolbar>
      <Divider />
      <List>
        {items.map((item, i) => (
          <Link key={i} href={item.link} passHref>
            <ListItem button>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          </Link>
        ))}
        {user && user.administrator && (
          <Link href='/dashboard/users' passHref>
            <ListItem button>
              <ListItemIcon><UsersIcon /></ListItemIcon>
              <ListItemText primary='Users' />
            </ListItem>
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
          ml: { sm: `${drawerWidth}px` },
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
                <Link href='/dash/manage' passHref>
                  <MenuItem onClick={handleClose(null)}>
                    <AccountIcon sx={{ mr: 2 }} /> Manage Account
                  </MenuItem>
                </Link>
                <MenuItem onClick={handleClose('copy')}>
                  <CopyIcon sx={{ mr: 2 }} /> Copy Token
                </MenuItem>
                <MenuItem onClick={handleClose('reset')}>
                  <ResetIcon sx={{ mr: 2 }} /> Reset Token
                </MenuItem>
                <Link href='/auth/logout' passHref>
                  <MenuItem onClick={handleClose(null)}>
                    <LogoutIcon sx={{ mr: 2 }} /> Logout
                  </MenuItem>
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
          flexShrink: { sm: 0 },
        }}
      >
        <Drawer
          container={container}
          variant='temporary'
          onClose={() => setMobileOpen(false)}
          open={mobileOpen}
          elevation={0}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '* .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant='permanent'
          sx={{
            display: { xs: 'none', sm: 'block' },
            '* .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
