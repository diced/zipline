import React, { useState } from 'react';
import Link from 'next/link';

import { useRouter } from 'next/router';
import { useStoreDispatch } from 'lib/redux/store';
import { updateUser } from 'lib/redux/reducers/user';
import useFetch from 'hooks/useFetch';
import { CheckIcon, CopyIcon, Cross1Icon, FileIcon, GearIcon, HomeIcon, Link1Icon, ResetIcon, UploadIcon, PinRightIcon, PersonIcon, Pencil1Icon, MixerHorizontalIcon } from '@modulz/radix-icons';
import { AppShell, Burger, Divider, Group, Header, MediaQuery, Navbar, Paper, Popover, ScrollArea, Select, Text, ThemeIcon, Title, UnstyledButton, useMantineTheme, Box } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { useNotifications } from '@mantine/notifications';
import { useClipboard } from '@mantine/hooks';
import { friendlyThemeName, themes } from './Theming';

function MenuItemLink(props) {
  return (
    <Link href={props.href} passHref>
      <MenuItem {...props} />
    </Link>
  );
}

function MenuItem(props) {
  return (
    <UnstyledButton
      sx={theme => ({ 
        display: 'block',
        width: '100%',
        padding: 5,
        borderRadius: theme.radius.sm,
        color: props.color
          ? theme.fn.themeColor(props.color, theme.colorScheme === 'dark' ? 5 : 7)
          : theme.colorScheme === 'dark'
            ? theme.colors.dark[0]
            : theme.black,  
        '&:hover': {
          backgroundColor: props.color
            ? theme.fn.rgba(
              theme.fn.themeColor(props.color, theme.colorScheme === 'dark' ? 9 : 0),
              theme.colorScheme === 'dark' ? 0.2 : 1
            )
            : theme.colorScheme === 'dark'
              ? theme.fn.rgba(theme.colors.dark[3], 0.35)
              : theme.colors.gray[0],
        },
      })}
      {...props}
    >
      <Group noWrap>
        <Box sx={theme => ({
          marginRight: theme.spacing.xs / 4,
          paddingLeft: theme.spacing.xs / 2,

          '& *': {
            display: 'block',
          },
        })}>
          {props.icon}
        </Box>
        <Text size='sm'>{props.children}</Text>
      </Group>
    </UnstyledButton>
  );
}

const items = [
  {
    icon: <HomeIcon />,
    text: 'Home',
    link: '/dashboard',
  },
  {
    icon: <FileIcon />,
    text: 'Files',
    link: '/dashboard/files',
  },
  {
    icon: <MixerHorizontalIcon />,
    text: 'Stats',
    link: '/dashboard/stats',
  },
  {
    icon: <Link1Icon />,
    text: 'URLs',
    link: '/dashboard/urls',
  },
  {
    icon: <UploadIcon />,
    text: 'Upload',
    link: '/dashboard/upload',
  },
];

export default function Layout({ children, user }) {
  const [token, setToken] = useState(user?.token);
  const [systemTheme, setSystemTheme] = useState(user.systemTheme ?? 'system');
  const [opened, setOpened] = useState(false); // navigation open
  const [open, setOpen] = useState(false); // manage acc dropdown
  const router = useRouter();
  const dispatch = useStoreDispatch();
  const theme = useMantineTheme();
  const modals = useModals();
  const notif = useNotifications();
  const clipboard = useClipboard();

  const handleUpdateTheme = async value => {
    const newUser = await useFetch('/api/user', 'PATCH', {
      systemTheme: value || 'dark_blue',
    });

    setSystemTheme(newUser.systemTheme);
    dispatch(updateUser(newUser));
    router.replace(router.pathname);

    notif.showNotification({
      title: `Theme changed to ${friendlyThemeName[value]}`,
      message: '',
      color: 'green',
      icon: <Pencil1Icon />,
    });
  };

  const openResetToken = () => modals.openConfirmModal({
    title: 'Reset Token',
    centered: true,
    overlayBlur: 3,
    children: (
      <Text size='sm'>
        Once you reset your token, you will have to update any uploaders to use this new token.
      </Text>
    ),
    labels: { confirm: 'Reset', cancel: 'Cancel' },
    onConfirm: async () => {
      const a = await useFetch('/api/user/token', 'PATCH');
      if (!a.success) {
        setToken(a.success);
        notif.showNotification({
          title: 'Token Reset Failed',
          message: a.error,
          color: 'red',
          icon: <Cross1Icon />,
        });
      } else {
        notif.showNotification({
          title: 'Token Reset',
          message: 'Your token has been reset. You will need to update any uploaders to use this new token.',
          color: 'green',
          icon: <CheckIcon />,
        });
      }

      modals.closeAll();
    },
  });

  const openCopyToken = () => modals.openConfirmModal({
    title: 'Copy Token',
    centered: true,
    overlayBlur: 3,
    children: (
      <Text size='sm'>
        Make sure you don&apos;t share this token with anyone as they will be able to upload files on your behalf.
      </Text>
    ),
    labels: { confirm: 'Copy', cancel: 'Cancel' },
    onConfirm: async () => {
      clipboard.copy(token);

      notif.showNotification({
        title: 'Token Copied',
        message: 'Your token has been copied to your clipboard.',
        color: 'green',
        icon: <CheckIcon />,
      });

      modals.closeAll();
    },
  });

  return (
    <AppShell
      navbarOffsetBreakpoint='sm'
      fixed
      navbar={
        <Navbar
          p='md'
          hiddenBreakpoint='sm'
          hidden={!opened}
          width={{ sm: 200, lg: 230 }}
        >
          <Navbar.Section
            grow
            component={ScrollArea}
            ml={-10}
            mr={-10}
            sx={{ paddingLeft: 10, paddingRight: 10 }}
          >
            {items.map(({ icon, text, link }) => (
              <Link href={link} key={text} passHref>
                <UnstyledButton
                  sx={{ 
                    display: 'block',
                    width: '100%',
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.sm,
                    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
                
                    '&:hover': {
                      backgroundColor: theme.other.hover,
                    },
                  }}
                >
                  <Group>
                    <ThemeIcon color='primary' variant='filled'>
                      {icon}
                    </ThemeIcon>

                    <Text size='lg'>{text}</Text>
                  </Group>
                </UnstyledButton>
              </Link>
            ))}
            {user.administrator && (
              <Link href='/dashboard/users' passHref>
                <UnstyledButton
                  sx={{ 
                    display: 'block',
                    width: '100%',
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.sm,
                    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
              
                    '&:hover': {
                      backgroundColor: theme.other.hover,
                    },
                  }}
                >
                  <Group>
                    <ThemeIcon color='primary' variant='filled'>
                      <PersonIcon />
                    </ThemeIcon>

                    <Text size='lg'>Users</Text>
                  </Group>
                </UnstyledButton>
              </Link>
            )}
          </Navbar.Section>
        </Navbar>
      }
      header={
        <Header height={70} p='md'>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <MediaQuery largerThan='sm' styles={{ display: 'none' }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size='sm'
                color={theme.colors.gray[6]}
              />
            </MediaQuery>
            <Title sx={{ marginLeft: 12 }}>Zipline</Title>
            <Box sx={{ marginLeft: 'auto', marginRight: 0 }}>
              <Popover
                position='top'
                placement='end'
                spacing={4}
                opened={open}
                onClose={() => setOpen(false)}
                target={
                  <UnstyledButton
                    onClick={() => setOpen(!open)}
                    sx={{ 
                      display: 'block',
                      width: '100%',
                      padding: theme.spacing.xs,
                      borderRadius: theme.radius.sm,
                      color: theme.other.color,
                
                      '&:hover': {
                        backgroundColor: theme.other.hover,
                      },
                    }}
                  >
                    <Group>
                      <ThemeIcon color='primary' variant='filled'>
                        <GearIcon />
                      </ThemeIcon>
                      <Text>{user.username}</Text>
                    </Group>
                  </UnstyledButton>
                }
              >
                <Group direction='column' spacing={2}>
                  <Text sx={{
                    color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
                    fontWeight: 500,
                    fontSize: theme.fontSizes.xs,
                    padding: `${theme.spacing.xs / 2}px ${theme.spacing.sm}px`,
                    cursor: 'default',
                  }}>User: {user.username}</Text>
                  <MenuItemLink icon={<GearIcon />} href='/dashboard/manage'>Manage Account</MenuItemLink>
                  <MenuItem icon={<CopyIcon />} onClick={() => {setOpen(false);openCopyToken();}}>Copy Token</MenuItem>
                  <MenuItem icon={<ResetIcon />} onClick={() => {setOpen(false);openResetToken();}} color='red'>Reset Token</MenuItem>
                  <MenuItemLink icon={<PinRightIcon />} href='/auth/logout' color='red'>Logout</MenuItemLink>
                  <Divider
                    variant='solid'
                    my={theme.spacing.xs / 2}
                    sx={theme => ({
                      width: '110%',
                      borderTopColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[2],
                      margin: `${theme.spacing.xs / 2}px -4px`,
                    })}
                  />
                  <MenuItem icon={<Pencil1Icon />}>
                    <Select           
                      size='xs'    
                      data={Object.keys(themes).map(t => ({ value: t, label: friendlyThemeName[t] }))}
                      value={systemTheme}
                      onChange={handleUpdateTheme}
                    />
                  </MenuItem>
                </Group>
              </Popover>
            </Box>
          </div>
        </Header>
      }
    >
      <Paper withBorder p='md' shadow='xs'>{children}</Paper>
    </AppShell>
  );
}