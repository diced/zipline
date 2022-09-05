import { AppShell, Box, Burger, Button, Divider, Header, MediaQuery, Navbar, NavLink, Paper, Popover, ScrollArea, Select, Stack, Text, Title, UnstyledButton, useMantineTheme, Group, Image, Tooltip, Badge } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import useFetch from 'hooks/useFetch';
import { useVersion } from 'lib/queries/version';
import { updateUser } from 'lib/redux/reducers/user';
import { useStoreDispatch } from 'lib/redux/store';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ExternalLinkIcon, ActivityIcon, CheckIcon, CopyIcon, CrossIcon, DeleteIcon, FileIcon, HomeIcon, LinkIcon, LogoutIcon, PencilIcon, SettingsIcon, TagIcon, TypeIcon, UploadIcon, UserIcon } from './icons';
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
    icon: <HomeIcon size={18} />,
    text: 'Home',
    link: '/dashboard',
  },
  {
    icon: <FileIcon size={18} />,
    text: 'Files',
    link: '/dashboard/files',
  },
  {
    icon: <ActivityIcon size={18} />,
    text: 'Stats',
    link: '/dashboard/stats',
  },
  {
    icon: <LinkIcon size={18} />,
    text: 'URLs',
    link: '/dashboard/urls',
  },
  {
    icon: <UploadIcon size={18} />,
    text: 'Upload',
    link: '/dashboard/upload',
  },
  {
    icon: <TypeIcon size={18} />,
    text: 'Upload Text',
    link: '/dashboard/text',
  },
];

const admin_items = [
  {
    icon: <UserIcon size={18} />,
    text: 'Users',
    link: '/dashboard/users',
  },
  {
    icon: <TagIcon size={18} />,
    text: 'Invites',
    link: '/dashboard/invites',
  },
];

export default function Layout({ children, user, props }) {
  const { title } = props;
  const external_links = JSON.parse(props.external_links ?? '[]');

  const [token, setToken] = useState(user?.token);
  const [systemTheme, setSystemTheme] = useState(user.systemTheme ?? 'system');
  // const [version, setVersion] = useState<{ local: string, upstream: string }>(null);
  const version = useVersion();
  const [opened, setOpened] = useState(false); // navigation open
  const [open, setOpen] = useState(false); // manage acc dropdown

  const avatar = user?.avatar ?? null;
  const router = useRouter();
  const dispatch = useStoreDispatch();
  const theme = useMantineTheme();
  const modals = useModals();
  const clipboard = useClipboard();

  const handleUpdateTheme = async value => {
    const newUser = await useFetch('/api/user', 'PATCH', {
      systemTheme: value || 'dark_blue',
    });

    setSystemTheme(newUser.systemTheme);
    dispatch(updateUser(newUser));
    router.replace(router.pathname);

    showNotification({
      title: `Theme changed to ${friendlyThemeName[value]}`,
      message: '',
      color: 'green',
      icon: <PencilIcon />,
    });
  };

  const openResetToken = () => modals.openConfirmModal({
    title: 'Reset Token',
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
        showNotification({
          title: 'Token Reset Failed',
          message: a.error,
          color: 'red',
          icon: <CrossIcon />,
        });
      } else {
        showNotification({
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
    children: (
      <Text size='sm'>
        Make sure you don&apos;t share this token with anyone as they will be able to upload files on your behalf.
      </Text>
    ),
    labels: { confirm: 'Copy', cancel: 'Cancel' },
    onConfirm: async () => {
      clipboard.copy(token);

      showNotification({
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
          pt='sm'
          hiddenBreakpoint='sm'
          hidden={!opened}
          width={{ sm: 200, lg: 230 }}
        >
          <Navbar.Section
            grow
            component={ScrollArea}
          >
            {items.map(({ icon, text, link }) => (
              <Link href={link} key={text} passHref>
                <NavLink
                  component='a'
                  label={text}
                  icon={icon}
                  active={router.pathname === link}
                  variant='light'
                />
              </Link>
            ))}
            {user.administrator && (
              <NavLink
                label='Administration'
                icon={<SettingsIcon />}
                childrenOffset={28}
                defaultOpened={admin_items.map(x => x.link).includes(router.pathname)}
              >
                {admin_items.map(({ icon, text, link }) => (
                  <Link href={link} key={text} passHref>
                    <NavLink
                      component='a'
                      label={text}
                      icon={icon}
                      active={router.pathname === link}
                      variant='light'
                    />
                  </Link>
                ))}
              </NavLink>
            )}
          </Navbar.Section>
          <Navbar.Section>
            {external_links.length ? external_links.map(({ label, link }, i) => (
              <Link href={link} passHref key={i}>
                <NavLink
                  label={label}
                  component='a'
                  target='_blank'
                  variant='light'
                  icon={<ExternalLinkIcon />}
                />
              </Link>
            )) : null}
          </Navbar.Section>
          {version.isSuccess ? (
            <Navbar.Section>
              <Tooltip
                label={
                  version.data.local !== version.data.upstream
                    ? `You are running an outdated version of Zipline, refer to the docs on how to update to ${version.data.upstream}`
                    : 'You are running the latest version of Zipline'
                }
              >
                <Badge
                  m='md'
                  radius='md'
                  size='lg'
                  variant='dot'
                  color={version.data.local !== version.data.upstream ? 'red' : 'primary'}
                >
                  {version.data.local}
                </Badge>
              </Tooltip>
            </Navbar.Section>
          ) : null}
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
            <Title ml='sm'>{title}</Title>
            <Box sx={{ marginLeft: 'auto', marginRight: 0 }}>
              <Popover
                position='bottom-end'
                opened={open}
                onClose={() => setOpen(false)}
              >
                <Popover.Target>
                  <Button
                    leftIcon={avatar ? <Image src={avatar} height={32} radius='md' /> : <SettingsIcon />}
                    onClick={() => setOpen((o) => !o)}
                    sx={t => ({
                      backgroundColor: '#00000000',
                      '&:hover': {
                        backgroundColor: t.other.hover,
                      },
                    })}
                    size='xl'
                    p='sm'
                  >
                    {user.username}
                  </Button>
                </Popover.Target>

                <Popover.Dropdown p={4}>
                  <Stack spacing={2}>
                    <Text sx={{
                      color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
                      fontWeight: 500,
                      fontSize: theme.fontSizes.sm,
                      padding: `${theme.spacing.xs / 2}px ${theme.spacing.sm}px`,
                      cursor: 'default',
                    }}
                    >
                      {user.username}
                    </Text>
                    <MenuItemLink icon={<SettingsIcon />} href='/dashboard/manage'>Manage Account</MenuItemLink>
                    <MenuItem icon={<CopyIcon />} onClick={() => { setOpen(false); openCopyToken(); }}>Copy Token</MenuItem>
                    <MenuItem icon={<DeleteIcon />} onClick={() => { setOpen(false); openResetToken(); }} color='red'>Reset Token</MenuItem>
                    <MenuItemLink icon={<LogoutIcon />} href='/auth/logout' color='red'>Logout</MenuItemLink>
                    <Divider
                      variant='solid'
                      my={theme.spacing.xs / 2}
                      sx={theme => ({
                        width: '110%',
                        borderTopColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[2],
                        margin: `${theme.spacing.xs / 2}px -4px`,
                      })}
                    />
                    <MenuItem icon={<PencilIcon />}>
                      <Select
                        size='xs'
                        data={Object.keys(themes).map(t => ({ value: t, label: friendlyThemeName[t] }))}
                        value={systemTheme}
                        onChange={handleUpdateTheme}
                      />
                    </MenuItem>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            </Box>
          </div>
        </Header>
      }
    >
      <Paper
        withBorder
        p='md'
        shadow='xs'
        sx={t => ({
          borderColor: t.colorScheme === 'dark' ? t.colors.dark[5] : t.colors.dark[0],
        })}
      >
        {children}
      </Paper>
    </AppShell>
  );
}