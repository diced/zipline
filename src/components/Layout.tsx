import {
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Header,
  Image,
  MediaQuery,
  Menu,
  Navbar,
  NavLink,
  Paper,
  ScrollArea,
  Select,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import useFetch from 'hooks/useFetch';
import { useVersion } from 'lib/queries/version';
import { userSelector } from 'lib/recoil/user';
import { capitalize } from 'lib/utils/client';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useRecoilState } from 'recoil';
import {
  ActivityIcon,
  CheckIcon,
  CopyIcon,
  CrossIcon,
  DeleteIcon,
  DiscordIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderIcon,
  GitHubIcon,
  GoogleIcon,
  HomeIcon,
  LinkIcon,
  LogoutIcon,
  PencilIcon,
  SettingsIcon,
  TagIcon,
  TypeIcon,
  UploadIcon,
  UserIcon,
} from './icons';
import { friendlyThemeName, themes } from './Theming';

export type NavbarItems = {
  icon: React.ReactNode;
  text: string;
  link?: string;
  children?: NavbarItems[];
  if?: (user: any, props: any) => boolean;
};

const items: NavbarItems[] = [
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
    icon: <FolderIcon size={18} />,
    text: 'Folders',
    link: '/dashboard/folders',
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
    children: [
      {
        icon: <UploadIcon size={18} />,
        text: 'File',
        link: '/dashboard/upload/file',
      },
      {
        icon: <TypeIcon size={18} />,
        text: 'Text',
        link: '/dashboard/upload/text',
      },
    ],
  },
  {
    icon: <UserIcon size={18} />,
    text: 'Administration',
    if: (user, _) => user.administrator as boolean,
    children: [
      {
        icon: <UserIcon size={18} />,
        text: 'Users',
        link: '/dashboard/users',
        if: () => true,
      },
      {
        icon: <TagIcon size={18} />,
        text: 'Invites',
        link: '/dashboard/invites',
        if: (_, props) => props.invites,
      },
    ],
  },
];

export default function Layout({ children, props }) {
  const [user, setUser] = useRecoilState(userSelector);

  const { title, oauth_providers: unparsed } = props;
  const oauth_providers = JSON.parse(unparsed);
  const icons = {
    GitHub: GitHubIcon,
    Discord: DiscordIcon,
    Google: GoogleIcon,
  };

  for (const provider of oauth_providers) {
    provider.Icon = icons[provider.name];
  }

  const external_links = JSON.parse(props.external_links ?? '[]');

  const [token, setToken] = useState(user?.token);
  const [systemTheme, setSystemTheme] = useState(user.systemTheme ?? 'system');
  const version = useVersion();
  const [opened, setOpened] = useState(false); // navigation open

  const avatar = user?.avatar ?? null;
  const router = useRouter();
  const theme = useMantineTheme();
  const modals = useModals();
  const clipboard = useClipboard();

  const handleUpdateTheme = async (value) => {
    const newUser = await useFetch('/api/user', 'PATCH', {
      systemTheme: value || 'dark_blue',
    });

    setSystemTheme(newUser.systemTheme);
    setUser(newUser);
    router.replace(router.pathname);

    showNotification({
      title: `Theme changed to ${friendlyThemeName[value]}`,
      message: '',
      color: 'green',
      icon: <PencilIcon />,
    });
  };

  const openResetToken = () =>
    modals.openConfirmModal({
      title: <Title>Reset Token?</Title>,
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
            message:
              'Your token has been reset. You will need to update any uploaders to use this new token.',
            color: 'green',
            icon: <CheckIcon />,
          });
        }

        modals.closeAll();
      },
    });

  const openCopyToken = () =>
    modals.openConfirmModal({
      title: <Title>Copy Token</Title>,
      children: (
        <Text size='sm'>
          Make sure you don&apos;t share this token with anyone as they will be able to upload files on your
          behalf.
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
        <Navbar pt='sm' hiddenBreakpoint='sm' hidden={!opened} width={{ sm: 200, lg: 230 }}>
          <Navbar.Section grow component={ScrollArea}>
            {items
              .filter((x) => (x.if ? x.if(user, props) : true))
              .map(({ icon, text, link, children }) =>
                children ? (
                  <NavLink
                    key={text}
                    label={text}
                    icon={icon}
                    defaultOpened={children.map((x) => x.link).includes(router.pathname)}
                  >
                    {children
                      .filter((x) => (x.if ? x.if(user, props) : true))
                      .map(({ icon, text, link }) => (
                        <Link href={link} key={text} passHref legacyBehavior>
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
                ) : (
                  <Link href={link} key={text} passHref legacyBehavior>
                    <NavLink
                      component='a'
                      label={text}
                      icon={icon}
                      active={router.pathname === link}
                      variant='light'
                    />
                  </Link>
                )
              )}
          </Navbar.Section>
          <Navbar.Section>
            {external_links.length
              ? external_links.map(({ label, link }, i) => (
                  <Link href={link} passHref key={i} legacyBehavior>
                    <NavLink
                      label={label}
                      component='a'
                      target='_blank'
                      variant='light'
                      icon={<ExternalLinkIcon />}
                    />
                  </Link>
                ))
              : null}
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
              <Menu>
                <Menu.Target>
                  <Button
                    leftIcon={avatar ? <Image src={avatar} height={32} radius='md' /> : <SettingsIcon />}
                    sx={(t) => ({
                      backgroundColor: 'inherit',
                      '&:hover': {
                        backgroundColor: t.other.hover,
                      },
                      color: t.colorScheme === 'dark' ? 'white' : 'black',
                    })}
                    size='xl'
                    p='sm'
                  >
                    {user.username}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>
                    {user.username} ({user.id}){' '}
                    {user.administrator && user.username !== 'administrator' ? '(Administrator)' : ''}
                  </Menu.Label>
                  <Menu.Item component={Link} icon={<SettingsIcon />} href='/dashboard/manage'>
                    Manage Account
                  </Menu.Item>
                  <Menu.Item
                    icon={<CopyIcon />}
                    onClick={() => {
                      openCopyToken();
                    }}
                  >
                    Copy Token
                  </Menu.Item>
                  <Menu.Item
                    icon={<DeleteIcon />}
                    onClick={() => {
                      openResetToken();
                    }}
                    color='red'
                  >
                    Reset Token
                  </Menu.Item>
                  <Menu.Item component={Link} icon={<LogoutIcon />} href='/auth/logout' color='red'>
                    Logout
                  </Menu.Item>
                  <Menu.Divider />
                  <>
                    {oauth_providers
                      .filter((x) =>
                        user.oauth
                          ?.map(({ provider }) => provider.toLowerCase())
                          .includes(x.name.toLowerCase())
                      )
                      .map(({ name, Icon }, i) => (
                        <>
                          <Menu.Item
                            closeMenuOnClick={false}
                            key={i}
                            icon={<Icon size={18} colorScheme={theme.colorScheme} />}
                          >
                            Logged in with {capitalize(name)}
                          </Menu.Item>
                        </>
                      ))}
                    {oauth_providers.filter((x) =>
                      user.oauth?.map(({ provider }) => provider.toLowerCase()).includes(x.name.toLowerCase())
                    ).length ? (
                      <Menu.Divider />
                    ) : null}
                  </>
                  <Menu.Item closeMenuOnClick={false} icon={<PencilIcon />}>
                    <Select
                      size='xs'
                      data={Object.keys(themes).map((t) => ({
                        value: t,
                        label: friendlyThemeName[t],
                      }))}
                      value={systemTheme}
                      onChange={handleUpdateTheme}
                    />
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          </div>
        </Header>
      }
    >
      <Paper
        withBorder
        p='md'
        shadow='xs'
        sx={(t) => ({
          borderColor: t.colorScheme === 'dark' ? t.colors.dark[5] : t.colors.dark[0],
        })}
      >
        {children}
      </Paper>
    </AppShell>
  );
}
