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
  rem,
  ScrollArea,
  Select,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { useClipboard, useMediaQuery } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import {
  IconBackspace,
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogle,
  IconBrush,
  IconClipboardCopy,
  IconExternalLink,
  IconFiles,
  IconFileText,
  IconFileUpload,
  IconFolders,
  IconGraph,
  IconHome,
  IconLink,
  IconLogout,
  IconReload,
  IconSettings,
  IconTag,
  IconUpload,
  IconUser,
  IconUserCog,
  IconUsers,
} from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';
import { useVersion } from 'lib/queries/version';
import { userSelector } from 'lib/recoil/user';
import { capitalize } from 'lib/utils/client';
import { UserExtended } from 'middleware/withZipline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useRecoilState } from 'recoil';
import { friendlyThemeName, themes } from './Theming';

export type NavbarItems = {
  icon: React.ReactNode;
  text: string;
  link?: string;
  children?: NavbarItems[];
  if?: (user: UserExtended, props: unknown) => boolean;
};

const items: NavbarItems[] = [
  {
    icon: <IconHome size={18} />,
    text: 'Home',
    link: '/dashboard',
  },
  {
    icon: <IconFiles size={18} />,
    text: 'Files',
    link: '/dashboard/files',
  },
  {
    icon: <IconFolders size={18} />,
    text: 'Folders',
    link: '/dashboard/folders',
  },
  {
    icon: <IconGraph size={18} />,
    text: 'Stats',
    link: '/dashboard/stats',
  },
  {
    icon: <IconLink size={18} />,
    text: 'URLs',
    link: '/dashboard/urls',
  },
  {
    icon: <IconUpload size={18} />,
    text: 'Upload',
    children: [
      {
        icon: <IconFileUpload size={18} />,
        text: 'File',
        link: '/dashboard/upload/file',
      },
      {
        icon: <IconFileText size={18} />,
        text: 'Text',
        link: '/dashboard/upload/text',
      },
    ],
  },
  {
    icon: <IconUser size={18} />,
    text: 'Administration',
    if: (user, _) => user.administrator as boolean,
    children: [
      {
        icon: <IconUsers size={18} />,
        text: 'Users',
        link: '/dashboard/users',
        if: () => true,
      },
      {
        icon: <IconTag size={18} />,
        text: 'Invites',
        link: '/dashboard/invites',
        if: (_, props: { invites: boolean }) => props.invites,
      },
    ],
  },
];

export default function Layout({ children, props }) {
  const [user, setUser] = useRecoilState(userSelector);

  const { title, oauth_providers: unparsed } = props;
  const oauth_providers = JSON.parse(unparsed);
  const icons = {
    GitHub: IconBrandGithubFilled,
    Discord: IconBrandDiscordFilled,
    Google: IconBrandGoogle,
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
      icon: <IconBrush size='1rem' />,
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
            icon: <IconReload size='1rem' />,
          });
        } else {
          showNotification({
            title: 'Token Reset',
            message:
              'Your token has been reset. You will need to update any uploaders to use this new token.',
            color: 'green',
            icon: <IconReload size='1rem' />,
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

        if (!navigator.clipboard)
          showNotification({
            title: 'Unable to copy token',
            message:
              "Zipline couldn't copy to your clipboard. Please copy the token manually from the settings page.",
            color: 'red',
            icon: <IconClipboardCopy size='1rem' />,
          });
        else
          showNotification({
            title: 'Token Copied',
            message: 'Your token has been copied to your clipboard.',
            color: 'green',
            icon: <IconClipboardCopy size='1rem' />,
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
                        <NavLink
                          key={text}
                          label={text}
                          icon={icon}
                          active={router.pathname === link}
                          variant='light'
                          component={Link}
                          href={link}
                        />
                      ))}
                  </NavLink>
                ) : (
                  <NavLink
                    key={text}
                    label={text}
                    icon={icon}
                    active={router.pathname === link}
                    variant='light'
                    component={Link}
                    href={link}
                  />
                )
              )}
          </Navbar.Section>
          <Navbar.Section>
            {external_links.length
              ? external_links.map(({ label, link }, i: number) => (
                  <NavLink
                    key={i}
                    label={label}
                    target='_blank'
                    variant='light'
                    icon={<IconExternalLink size={18} />}
                    component={Link}
                    href={link}
                  />
                ))
              : null}
          </Navbar.Section>
          {version.isSuccess ? (
            <Navbar.Section>
              <Tooltip
                label={
                  version.data.update
                    ? `There is a new ${version.data.updateToType} version: ${
                        version.data.versions[version.data.updateToType]
                      }`
                    : `You are running the latest ${version.data.isUpstream ? 'upstream' : 'stable'} version`
                }
              >
                <Badge
                  m='md'
                  radius='md'
                  size='lg'
                  variant='dot'
                  color={version.data.update ? 'red' : 'primary'}
                >
                  {version.data.versions.current}
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
              <Menu
                styles={{
                  item: {
                    '@media (max-width: 768px)': {
                      padding: '1rem',
                      width: '80vw',
                    },
                  },
                }}
              >
                <Menu.Target>
                  <Button
                    leftIcon={
                      avatar ? (
                        <Image src={avatar} height={32} width={32} fit='cover' radius='md' />
                      ) : (
                        <IconUserCog size='1rem' />
                      )
                    }
                    variant='subtle'
                    color='gray'
                    compact
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
                  <Menu.Item component={Link} icon={<IconFiles size='1rem' />} href='/dashboard/files'>
                    Files
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    icon={<IconFileUpload size='1rem' />}
                    href='/dashboard/upload/file'
                  >
                    Upload File
                  </Menu.Item>
                  <Menu.Item component={Link} icon={<IconLink size='1rem' />} href='/dashboard/urls'>
                    Shorten URL
                  </Menu.Item>

                  <Menu.Label>Settings</Menu.Label>
                  <Menu.Item component={Link} icon={<IconSettings size='1rem' />} href='/dashboard/manage'>
                    Manage Account
                  </Menu.Item>
                  <Menu.Item
                    icon={<IconClipboardCopy size='1rem' />}
                    onClick={() => {
                      openCopyToken();
                    }}
                  >
                    Copy Token
                  </Menu.Item>
                  <Menu.Item icon={<IconLogout size='1rem' />} component={Link} href='/auth/logout'>
                    Logout
                  </Menu.Item>

                  <Menu.Label>Danger</Menu.Label>
                  <Menu.Item
                    icon={<IconBackspace size='1rem' />}
                    onClick={() => {
                      openResetToken();
                    }}
                    color='red'
                  >
                    Reset Token
                  </Menu.Item>
                  <Menu.Divider />
                  <>
                    {oauth_providers.filter((x) =>
                      user.oauth?.map(({ provider }) => provider.toLowerCase()).includes(x.name.toLowerCase())
                    ).length ? (
                      <Menu.Label>Connected Accounts</Menu.Label>
                    ) : null}
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
                  <Menu.Item closeMenuOnClick={false} icon={<IconBrush size='1rem' />}>
                    <Select
                      size={useMediaQuery('(max-width: 768px)') ? 'md' : 'xs'}
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
        mr='md'
        mb='md'
        shadow='xs'
        sx={(theme) => ({
          '&[data-with-border]': {
            border: `${rem(1)} solid ${
              theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
            }`,
          },
        })}
      >
        {children}
      </Paper>
    </AppShell>
  );
}
