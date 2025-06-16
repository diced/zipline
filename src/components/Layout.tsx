import type { Response } from '@/lib/api/response';
import type { SafeConfig } from '@/lib/config/safe';
import { fetchApi } from '@/lib/fetchApi';
import useAvatar from '@/lib/hooks/useAvatar';
import useLogin from '@/lib/hooks/useLogin';
import { isAdministrator } from '@/lib/role';
import { useUserStore } from '@/lib/store/user';
import React from 'react';
import styles from './Layout.module.css';
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Menu,
  NavLink,
  Paper,
  ScrollArea,
  Title,
  useMantineColorScheme,
  useMantineTheme,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import {
  IconAdjustments,
  IconChevronDown,
  IconChevronRight,
  IconClipboardCopy,
  IconExternalLink,
  IconFileText,
  IconFileUpload,
  IconFiles,
  IconFolder,
  IconGraph,
  IconHome,
  IconLink,
  IconLogout,
  IconRefreshDot,
  IconSettingsFilled,
  IconShieldLockFilled,
  IconTags,
  IconUpload,
  IconUsersGroup,
  IconMenu2,
  IconMenuDeep,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import ConfigProvider from './ConfigProvider';
import VersionBadge from './VersionBadge';

type NavLinks = {
  label: string;
  icon: React.ReactNode;
  active: (path: string) => boolean;
  href?: string;
  links?: NavLinks[];
  if?: (user: Response['/api/user']['user'], config: SafeConfig) => boolean;
};

const navLinks: NavLinks[] = [
  {
    label: 'Home',
    icon: <IconHome size='1rem' />,
    active: (path: string) => path === '/dashboard',
    href: '/dashboard',
  },
  {
    label: 'Metrics',
    icon: <IconGraph size='1rem' />,
    active: (path: string) => path === '/dashboard/metrics',
    href: '/dashboard/metrics',
    if: (user, config) =>
      config.features.metrics.enabled &&
      (config.features.metrics.adminOnly ? isAdministrator(user?.role) : true),
  },
  {
    label: 'Files',
    icon: <IconFiles size='1rem' />,
    active: (path: string) => path === '/dashboard/files',
    href: '/dashboard/files',
  },
  {
    label: 'Folders',
    icon: <IconFolder size='1rem' />,
    active: (path: string) => path === '/dashboard/folders',
    href: '/dashboard/folders',
  },
  {
    label: 'Upload',
    icon: <IconUpload size='1rem' />,
    active: (path: string) => path.startsWith('/dashboard/upload'),
    links: [
      {
        label: 'File',
        icon: <IconFileUpload size='1rem' />,
        active: (path: string) => path === '/dashboard/upload/file',
        href: '/dashboard/upload/file',
      },
      {
        label: 'Text',
        icon: <IconFileText size='1rem' />,
        active: (path: string) => path === '/dashboard/upload/text',
        href: '/dashboard/upload/text',
      },
    ],
  },
  {
    label: 'URLs',
    icon: <IconLink size='1rem' />,
    active: (path: string) => path === '/dashboard/urls',
    href: '/dashboard/urls',
  },
  {
    label: 'Administrator',
    icon: <IconShieldLockFilled size='1rem' />,
    if: (user) => isAdministrator(user?.role),
    active: (path: string) => path.startsWith('/dashboard/admin'),
    links: [
      {
        label: 'Settings',
        icon: <IconAdjustments size='1rem' />,
        active: (path: string) => path === '/dashboard/admin/settings',
        if: (user) => user?.role === 'SUPERADMIN',
        href: '/dashboard/admin/settings',
      },
      {
        label: 'Users',
        icon: <IconUsersGroup size='1rem' />,
        active: (path: string) => path === '/dashboard/admin/users',
        href: '/dashboard/admin/users',
      },
      {
        label: 'Invites',
        icon: <IconTags size='1rem' />,
        active: (path: string) => path === '/dashboard/admin/invites',
        href: '/dashboard/admin/invites',
        if: (_, config) => config.invites.enabled,
      },
    ],
  },
];

export default function Layout({ children, config }: { children: React.ReactNode; config: SafeConfig }) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [opened, setOpened] = useState(false);
  const [navbarCollapsed, setNavbarCollapsed] = useState(() => {
    // Restore collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const router = useRouter();
  const modals = useModals();
  const clipboard = useClipboard();
  const setUser = useUserStore((s) => s.setUser);
  const { user, mutate } = useLogin();
  const { avatar } = useAvatar();
  // Prevent sidebar from auto-expanding on route changes
  useEffect(() => {
    const handleRouteChange = () => {
      // Close mobile sidebar on route change
      setOpened(false);
      // Keep desktop sidebar collapsed state as is (don't auto-expand)
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(navbarCollapsed));
    }
  }, [navbarCollapsed]);

  const copyToken = () => {
    modals.openConfirmModal({
      title: 'Copy token?',
      children:
        'Are you sure you want to copy your token? Your token can interact with all parts of Zipline. Do not share this token with anyone.',
      labels: { confirm: 'Copy', cancel: 'No, close this popup' },
      onConfirm: async () => {
        const { data, error } = await fetchApi<Response['/api/user/token']>('/api/user/token');
        if (error) {
          showNotification({
            title: 'Error',
            message: error.error,
            color: 'red',
            icon: <IconClipboardCopy size='1rem' />,
          });
        } else {
          clipboard.copy(data?.token ?? '');
          showNotification({
            title: 'Copied',
            message: 'Your token has been copied to your clipboard.',
            color: 'green',
            icon: <IconClipboardCopy size='1rem' />,
          });
        }
      },
    });
  };

  const refreshToken = () => {
    modals.openConfirmModal({
      title: 'Refresh token?',

      children:
        'Are you sure you want to refresh your token? Once you refresh/reset your token, you will need to update any scripts or applications that use your token.',
      labels: { confirm: 'Refresh', cancel: 'No, close this popup' },
      onConfirm: async () => {
        const { data, error } = await fetchApi<Response['/api/user/token']>('/api/user/token', 'PATCH');
        if (error) {
          showNotification({
            title: 'Error',
            message: error.error,
            color: 'red',
            icon: <IconRefreshDot size='1rem' />,
          });
        } else {
          setUser(data?.user);
          mutate(data as Response['/api/user']);

          showNotification({
            title: 'Refreshed',
            message: 'Your token has been refreshed.',
            color: 'green',
            icon: <IconRefreshDot size='1rem' />,
          });
        }
      },
    });
  };
  return (
    <AppShell
      navbar={{
        breakpoint: 'sm',
        width: { sm: navbarCollapsed ? 64 : 240, lg: navbarCollapsed ? 64 : 260 },
        collapsed: { mobile: !opened },
      }}
      header={{ height: 60 }}
      footer={{ height: { base: 0.1 } }}
      styles={{
        navbar: {
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      }}
    >
      <AppShell.Header px='md'>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Burger
            opened={opened}
            onClick={() => setOpened((o) => !o)}
            size='sm'
            color={theme.colors.gray[6]}
            mr='xl'
            hiddenFrom='sm'
          />
          {config.website.titleLogo && (
            <Avatar src={config.website.titleLogo} alt='Zipline logo' radius='sm' size='md' mr='md' />
          )}{' '}
          <Title visibleFrom='sm' lineClamp={1} size={32}>
            {config.website.title.trim()}
          </Title>{' '}
          {/* Desktop sidebar toggle button */}
          <Tooltip label={navbarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} position='bottom'>
            <ActionIcon
              variant='light'
              size='lg'
              onClick={() => setNavbarCollapsed(!navbarCollapsed)}
              visibleFrom='sm'
              ml='md'
              style={{
                borderRadius: theme.radius.md,
                transition: 'all 0.2s ease',
              }}
            >
              {navbarCollapsed ? <IconMenuDeep size='1.1rem' /> : <IconMenu2 size='1.1rem' />}
            </ActionIcon>
          </Tooltip>
          <div style={{ marginLeft: 'auto' }}>
            <Menu shadow='md' width={200}>
              <Menu.Target>
                <Button
                  variant='transparent'
                  color={colorScheme === 'dark' ? 'white' : 'black'}
                  leftSection={
                    avatar ? (
                      <Avatar src={avatar} radius='sm' size='sm' alt={user?.username ?? 'User avatar'} />
                    ) : (
                      <IconSettingsFilled size='1rem' />
                    )
                  }
                  rightSection={<IconChevronDown size='0.7rem' />}
                  size='sm'
                >
                  {user?.username}
                </Button>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  {user?.username}
                  {isAdministrator(user?.role) ? ' (Administrator)' : ''}
                </Menu.Label>

                <Menu.Item leftSection={<IconClipboardCopy size='1rem' />} onClick={copyToken}>
                  Copy token
                </Menu.Item>
                <Menu.Item color='red' leftSection={<IconRefreshDot size='1rem' />} onClick={refreshToken}>
                  Refresh token
                </Menu.Item>
                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconSettingsFilled size='1rem' />}
                  component={Link}
                  href='/dashboard/settings'
                >
                  Settings
                </Menu.Item>

                {user?.role === 'SUPERADMIN' && (
                  <Menu.Item
                    leftSection={<IconAdjustments size='1rem' />}
                    component={Link}
                    href='/dashboard/admin/settings'
                  >
                    Server Settings
                  </Menu.Item>
                )}

                <Menu.Divider />
                <Menu.Item
                  color='red'
                  leftSection={<IconLogout size='1rem' />}
                  component={Link}
                  href='/auth/logout'
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>{' '}
      </AppShell.Header>{' '}
      <AppShell.Navbar
        hidden={!opened}
        zIndex={90}
        className={styles.navbar}
        style={{
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
        }}
      >
        {/* Mobile title */}
        <Box hiddenFrom='sm' p='md' pb='xs'>
          <Title size={24} style={{ marginBottom: 8 }}>
            {config.website.title.trim()}
          </Title>
          <Divider />
        </Box>{' '}
        {/* Main navigation section */}
        <ScrollArea
          flex={1}
          type='never'
          className={styles.navbarContent}
          style={{
            padding: navbarCollapsed ? '12px 4px' : '16px 12px',
          }}
        >
          <Box>
            {navLinks
              .filter((link) => !link.if || link.if(user as Response['/api/user']['user'], config))
              .map((link) => {
                if (!link.links) {
                  if (navbarCollapsed) {
                    // For collapsed state, use a simple div with native HTML title tooltip
                    return (
                      <div
                        key={link.label}
                        title={link.label} // Use native HTML title for tooltip
                        style={{
                          borderRadius: theme.radius.md,
                          marginBottom: '4px',
                          padding: '12px 8px',
                          minHeight: '48px',
                          cursor: 'pointer',
                          backgroundColor:
                            router.pathname === link.href
                              ? colorScheme === 'dark'
                                ? theme.colors.dark[6]
                                : theme.colors.gray[2]
                              : 'transparent',
                        }}
                        className={`${styles.navItemCollapsed} ${styles.collapsedItem}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Ensure sidebar stays collapsed when navigating
                          router.push(link.href || '');
                        }}
                      >
                        <Box
                          className={styles.iconWrapper}
                          style={{
                            fontSize: '1.4rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {link.icon}
                        </Box>
                      </div>
                    );
                  } else {
                    // For expanded state, use regular NavLink without tooltip
                    return (
                      <NavLink
                        key={link.label}
                        label={link.label}
                        leftSection={
                          <Box
                            className={styles.iconWrapper}
                            style={{
                              fontSize: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {link.icon}
                          </Box>
                        }
                        variant='light'
                        rightSection={<IconChevronRight size='0.7rem' />}
                        active={router.pathname === link.href}
                        component={Link}
                        href={link.href || ''}
                        style={{
                          borderRadius: theme.radius.md,
                          marginBottom: '4px',
                          padding: '10px 12px',
                        }}
                        className={styles.navItem}
                      />
                    );
                  }
                } else {
                  if (navbarCollapsed) {
                    // In collapsed mode, show a menu for parent items with children
                    return (
                      <Menu key={link.label} position='right-start' offset={12} withinPortal>
                        {' '}
                        <Menu.Target>
                          <div
                            title={link.label} // Use native HTML title for tooltip
                            style={{
                              padding: '12px 8px',
                              marginBottom: '4px',
                              borderRadius: theme.radius.md,
                              minHeight: '48px',
                              cursor: 'pointer',
                              backgroundColor: link.active(router.pathname)
                                ? colorScheme === 'dark'
                                  ? theme.colors.dark[6]
                                  : theme.colors.gray[2]
                                : 'transparent',
                            }}
                            className={`${styles.navItemCollapsed} ${styles.collapsedItem}`}
                          >
                            <Box
                              style={{
                                fontSize: '1.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {link.icon}
                            </Box>
                          </div>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>{link.label}</Menu.Label>
                          {link.links
                            .filter(
                              (sublink) =>
                                !sublink.if || sublink.if(user as Response['/api/user']['user'], config),
                            )
                            .map((sublink) => (
                              <Menu.Item
                                key={sublink.label}
                                leftSection={sublink.icon}
                                component={Link}
                                href={sublink.href || ''}
                              >
                                {sublink.label}
                              </Menu.Item>
                            ))}{' '}
                        </Menu.Dropdown>
                      </Menu>
                    );
                  } else {
                    return (
                      <NavLink
                        key={link.label}
                        label={link.label}
                        leftSection={link.icon}
                        variant='light'
                        rightSection={<IconChevronRight size='0.7rem' />}
                        defaultOpened={link.active(router.pathname)}
                        style={{
                          borderRadius: theme.radius.md,
                          marginBottom: '4px',
                          padding: '10px 12px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {link.links
                          .filter(
                            (sublink) =>
                              !sublink.if || sublink.if(user as Response['/api/user']['user'], config),
                          )
                          .map((sublink) => (
                            <NavLink
                              key={sublink.label}
                              label={sublink.label}
                              leftSection={sublink.icon}
                              rightSection={<IconChevronRight size='0.7rem' />}
                              variant='light'
                              active={router.pathname === sublink.href}
                              component={Link}
                              href={sublink.href || ''}
                              style={{
                                borderRadius: theme.radius.sm,
                                marginTop: '2px',
                                transition: 'all 0.2s ease',
                              }}
                            />
                          ))}
                      </NavLink>
                    );
                  }
                }
              })}
          </Box>
        </ScrollArea>
        {/* Bottom section with version and external links */}
        <Box
          className={styles.bottomSection}
          style={{
            borderTop: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
            padding: navbarCollapsed ? '10px 4px' : '12px',
          }}
        >
          {/* Version badge */}
          <Box
            mb='xs'
            className={styles.versionWrapper}
            style={{
              display: 'flex',
              justifyContent: navbarCollapsed ? 'center' : 'flex-start',
            }}
          >
            <VersionBadge />
          </Box>

          {/* External links */}
          {config.website.externalLinks.length > 0 && (
            <Box>
              {' '}
              {config.website.externalLinks.map(({ name, url }, i) => {
                if (navbarCollapsed) {
                  return (
                    <div
                      key={i}
                      title={name} // Use native HTML title for tooltip
                      style={{
                        borderRadius: theme.radius.sm,
                        marginBottom: '3px',
                        padding: '10px 8px',
                        minHeight: '40px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                      className={`${styles.navItemCollapsed} ${styles.collapsedItem}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(url, '_blank');
                      }}
                    >
                      <Box
                        style={{
                          fontSize: '1.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconExternalLink />
                      </Box>
                    </div>
                  );
                } else {
                  return (
                    <NavLink
                      key={i}
                      label={name}
                      leftSection={
                        <Box
                          style={{
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <IconExternalLink />
                        </Box>
                      }
                      variant='subtle'
                      component={Link}
                      href={url}
                      target='_blank'
                      style={{
                        borderRadius: theme.radius.sm,
                        marginBottom: '3px',
                        fontSize: '0.875rem',
                        padding: '8px 12px',
                      }}
                    />
                  );
                }
              })}
            </Box>
          )}
        </Box>
      </AppShell.Navbar>
      <AppShell.Main>
        <ConfigProvider config={config}>
          <Paper m='lg' withBorder p='xs'>
            {children}
          </Paper>
        </ConfigProvider>
      </AppShell.Main>
      <AppShell.Footer display='none' />
    </AppShell>
  );
}
