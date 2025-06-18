import type { Response } from '@/lib/api/response';
import type { SafeConfig } from '@/lib/config/safe';
import { fetchApi } from '@/lib/fetchApi';
import useAvatar from '@/lib/hooks/useAvatar';
import useLogin from '@/lib/hooks/useLogin';
import { isAdministrator } from '@/lib/role';
import { useUserStore } from '@/lib/store/user';
import { useSettingsStore } from '@/lib/store/settings';
import React from 'react';
import styles from './Layout.module.css';
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  Menu,
  Modal,
  NavLink,
  Paper,
  PasswordInput,
  ScrollArea,
  Title,
  useMantineColorScheme,
  useMantineTheme,
  ActionIcon,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import {
  IconAdjustments,
  IconCheck,
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
  IconLock,
  IconLogout,
  IconRefreshDot,
  IconSettingsFilled,
  IconShieldLockFilled,
  IconTags,
  IconUpload,
  IconUsersGroup,
  IconMenu2,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
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
  const [backgroundType, backgroundImageUrl] = useSettingsStore(
    useShallow((state) => [state.settings.backgroundType, state.settings.backgroundImageUrl]),
  );
  const [opened, setOpened] = useState(false);
  const [navbarCollapsed, setNavbarCollapsed] = useState(() => {
    // Restore collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showLogoText, setShowLogoText] = useState(false); // 初始為 false，讓動畫在 useEffect 中觸發
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'copy' | 'refresh' | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const modals = useModals();
  const clipboard = useClipboard();

  // Check if custom background should be applied
  const hasCustomBackground =
    backgroundType === 'image' && backgroundImageUrl && backgroundImageUrl.trim() !== '';

  // Debug logging
  useEffect(() => {
    console.log('Background settings:', { backgroundType, backgroundImageUrl, hasCustomBackground });
  }, [backgroundType, backgroundImageUrl, hasCustomBackground]);

  // Password confirmation form for modal
  const passwordForm = useForm({
    initialValues: {
      currentPassword: '',
    },
    validate: {
      currentPassword: (value) => (value.length < 1 ? 'Current password is required' : null),
    },
  });
  const setUser = useUserStore((s) => s.setUser);
  const { user, mutate } = useLogin();
  const { avatar } = useAvatar();

  // Password verification function
  const verifyPassword = async (password: string) => {
    const { data, error } = await fetchApi<{ valid: boolean }>('/api/user/verify-password', 'POST', {
      password: password,
    });

    if (error || !data?.valid) {
      passwordForm.setFieldError('currentPassword', 'Invalid password');
      return false;
    }

    return true;
  };

  // Handle password confirmation
  const handlePasswordConfirmation = async (values: { currentPassword: string }) => {
    const isValid = await verifyPassword(values.currentPassword);

    if (!isValid) {
      return;
    }

    // Password is valid, proceed with the pending action
    setShowPasswordModal(false);
    passwordForm.reset();

    if (pendingAction === 'copy') {
      await performCopyToken();
    } else if (pendingAction === 'refresh') {
      await performRefreshToken();
    }

    setPendingAction(null);
  };

  // Perform actual token copy after password verification
  const performCopyToken = async () => {
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
  };

  // Perform actual token refresh after password verification
  const performRefreshToken = async () => {
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
  };
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

  // Initialize logo text state after component mounts
  useEffect(() => {
    // Set initial state based on collapsed state after component mounts
    if (!navbarCollapsed) {
      setShowLogoText(true);
    }
  }, []); // Run only once on mount

  // Save collapsed state to localStorage and handle logo text animation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(navbarCollapsed));
    }

    // Handle logo text animation timing
    if (navbarCollapsed) {
      // Start hiding text with a slight delay to ensure animation is visible
      const timer = setTimeout(() => {
        setShowLogoText(false);
      }, 50); // Very short delay to ensure state change triggers animation

      return () => clearTimeout(timer);
    } else {
      // Show text after a small delay when expanding
      const timer = setTimeout(() => {
        setShowLogoText(true);
      }, 100); // Small delay to let sidebar start expanding

      return () => clearTimeout(timer);
    }
  }, [navbarCollapsed]);

  // Handle scroll events for header border radius
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const copyToken = () => {
    modals.openConfirmModal({
      title: 'Copy token?',
      children:
        'Are you sure you want to copy your token? Your token can interact with all parts of Zipline. Do not share this token with anyone.',
      labels: { confirm: 'Continue', cancel: 'No, close this popup' },
      onConfirm: () => {
        setPendingAction('copy');
        setShowPasswordModal(true);
      },
    });
  };

  const refreshToken = () => {
    modals.openConfirmModal({
      title: 'Refresh token?',
      children:
        'Are you sure you want to refresh your token? Once you refresh/reset your token, you will need to update any scripts or applications that use your token.',
      labels: { confirm: 'Continue', cancel: 'No, close this popup' },
      onConfirm: () => {
        setPendingAction('refresh');
        setShowPasswordModal(true);
      },
    });
  };
  return (
    <>
      {/* Custom Background Image */}
      {hasCustomBackground && (
        <div
          className={styles.customBackground}
          style={{
            backgroundImage: `url("${backgroundImageUrl}")`,
          }}
        />
      )}

      <AppShell
        className={`${hasCustomBackground ? styles.appShellWithBackground : ''} ${styles.mobileHeaderFix} ${styles.menuDropdownFix} ${styles.navbarAnimationFix} ${styles.sidebarMenuFix}`}
        navbar={{
          breakpoint: 'sm',
          // width: { sm: navbarCollapsed ? 64 : 240, lg: navbarCollapsed ? 260 : 260 },
          width: { sm: navbarCollapsed ? 64 : 240, lg: navbarCollapsed ? 80 : 260 },
          collapsed: { mobile: !opened },
        }}
        header={{ height: '62.5' }}
        footer={{ height: { base: 0.1 } }}
        styles={{
          navbar: {
            transition: 'all 0.5s ease-in-out',
          },
          header: {
            transition: 'all 0.5s ease-in-out',
          },
          main: {
            transition: 'all 0.5s ease-in-out',
          },
        }}
      >
        <AppShell.Header
          px='md'
          className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''} ${navbarCollapsed ? styles.headerCollapsed : styles.headerExpanded} ${hasCustomBackground ? styles.headerWithBackground : ''}`}
        >
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size='sm'
                color={theme.colors.gray[6]}
                mr='xl'
                hiddenFrom='sm'
              />

              {/* Version badge on the left side */}
            </div>

            <div className={styles.menuEnhancedWrapper}>
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

                <Menu.Dropdown className={styles.accountMenuDropdown}>
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
            <Box visibleFrom='sm'>
              <VersionBadge />
            </Box>
          </div>{' '}
        </AppShell.Header>{' '}
        <AppShell.Navbar
          hidden={!opened}
          zIndex={90}
          className={`${styles.navbar} ${styles.navbarBase} ${hasCustomBackground ? styles.navbarWithBackground : ''}`}
        >
          {/* Desktop logo section */}
          <Box visibleFrom='sm' className={styles.logoSection}>
            {/* Logo image - always visible */}
            {config.website.titleLogo && (
              <Avatar
                src={config.website.titleLogo}
                alt='Zipline logo'
                radius='sm'
                size='md'
                className={styles.logoImage}
              />
            )}

            {/* Logo text - animated */}
            <Title
              size={20}
              lineClamp={1}
              ta='center'
              className={`${styles.logoText} ${showLogoText ? styles.logoTextVisible : styles.logoTextHidden}`}
            >
              {config.website.title?.trim() || 'Zipline'}
            </Title>
          </Box>
          {/* Mobile title */}
          <Box hiddenFrom='sm' p='md' pb='xs'>
            <Title size={24} style={{ marginBottom: 8 }}>
              {config.website.title?.trim() || 'Zipline'}
            </Title>
            <Divider />
          </Box>{' '}
          {/* Main navigation section */}
          <ScrollArea flex={1} type='never' className={`${styles.navbarContent} ${styles.navSection}`}>
            <div className={navbarCollapsed ? styles.navSectionCollapsed : ''}>
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
                            className={`${styles.navItemCollapsed} ${styles.collapsedItem} ${styles.navItemCollapsedBase}`}
                            style={{
                              backgroundColor:
                                router.pathname === link.href
                                  ? colorScheme === 'dark'
                                    ? theme.colors.dark[6]
                                    : theme.colors.gray[2]
                                  : 'transparent',
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Ensure sidebar stays collapsed when navigating
                              router.push(link.href || '');
                            }}
                          >
                            <Box
                              className={`${styles.iconWrapper} ${styles.iconWrapperBase} ${styles.iconWrapperCollapsed}`}
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
                                className={`${styles.iconWrapper} ${styles.iconWrapperBase} ${styles.iconWrapperExpanded}`}
                              >
                                {link.icon}
                              </Box>
                            }
                            variant='light'
                            rightSection={<IconChevronRight size='0.7rem' />}
                            active={router.pathname === link.href}
                            component={Link}
                            href={link.href || ''}
                            className={`${styles.navItem} ${styles.navItemBase}`}
                          />
                        );
                      }
                    } else {
                      if (navbarCollapsed) {
                        // In collapsed mode, show a menu for parent items with children
                        return (
                          <Menu
                            key={link.label}
                            position='right-start'
                            offset={12}
                            withinPortal={true}
                            transitionProps={{ transition: 'fade', duration: 200 }}
                          >
                            <Menu.Target>
                              <div
                                title={link.label} // Use native HTML title for tooltip
                                className={`${styles.navItemCollapsed} ${styles.collapsedItem} ${styles.navItemCollapsedBase}`}
                                style={{
                                  backgroundColor:
                                    router.pathname === link.href
                                      ? colorScheme === 'dark'
                                        ? theme.colors.dark[6]
                                        : theme.colors.gray[2]
                                      : 'transparent',
                                }}
                              >
                                <Box
                                  className={`${styles.iconWrapper} ${styles.iconWrapperBase} ${styles.iconWrapperCollapsed}`}
                                >
                                  {link.icon}
                                </Box>
                              </div>
                            </Menu.Target>
                            <Menu.Dropdown style={{ zIndex: 1001 }} className={styles.collapsedMenuDropdown}>
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
                                ))}
                            </Menu.Dropdown>
                          </Menu>
                        );
                      } else {
                        return (
                          <NavLink
                            key={link.label}
                            label={link.label}
                            leftSection={
                              <Box
                                className={`${styles.iconWrapper} ${styles.iconWrapperBase} ${styles.iconWrapperExpanded}`}
                              >
                                {link.icon}
                              </Box>
                            }
                            variant='light'
                            rightSection={<IconChevronRight size='0.7rem' />}
                            active={router.pathname === link.href}
                            component={Link}
                            href={link.href || ''}
                            className={`${styles.navItem} ${styles.navItemBase}`}
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
                                  className={styles.subNavItem}
                                />
                              ))}
                          </NavLink>
                        );
                      }
                    }
                  })}

                {/* Desktop sidebar toggle button */}
              </Box>
            </div>
          </ScrollArea>
          {/* Bottom section with version and external links */}
          <Box
            mt='sm'
            visibleFrom='sm'
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: navbarCollapsed ? '8px' : '10px',
              marginTop: '8px',
            }}
          >
            <ActionIcon
              variant='light'
              size='lg'
              onClick={() => setNavbarCollapsed(!navbarCollapsed)}
              className={`${styles.sidebarToggle} ${navbarCollapsed ? styles.sidebarToggleCollapsed : styles.sidebarToggleExpanded}`}
            >
              <Group gap='xs'>
                <IconMenu2 size='1.5rem' />
              </Group>
            </ActionIcon>
          </Box>
          <Box className={styles.bottomSectionBase}>
            {/* External links */}
            {config.website.externalLinks.length > 0 && (
              <Box className={styles.externalLinksContainer}>
                {' '}
                {config.website.externalLinks.map(({ name, url }, i) => {
                  if (navbarCollapsed) {
                    return (
                      <div
                        key={i}
                        title={name} // Use native HTML title for tooltip
                        className={`${styles.navItemCollapsed} ${styles.collapsedItem} ${styles.externalLink} ${styles.externalLinkCollapsed}`}
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
                              marginLeft: '4px',
                            }}
                          >
                            <IconExternalLink />
                          </Box>
                        }
                        variant='subtle'
                        component={Link}
                        href={url}
                        target='_blank'
                        className={`${styles.externalLink} ${styles.externalLinkExpanded}`}
                      />
                    );
                  }
                })}
              </Box>
            )}
          </Box>
        </AppShell.Navbar>{' '}
        <AppShell.Main className={styles.mainContent}>
          <ConfigProvider config={config}>
            <Paper
              m='lg'
              withBorder
              p='md'
              className={`${styles.mainContentPaper} ${hasCustomBackground ? styles.mainContentPaperWithBackground : ''}`}
            >
              {children}
            </Paper>
          </ConfigProvider>
        </AppShell.Main>
        <AppShell.Footer display='none' />
        {/* Password Confirmation Modal */}
        <Modal
          opened={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            passwordForm.reset();
            setPendingAction(null);
          }}
          title={`Enter Password to ${pendingAction === 'copy' ? 'Copy' : 'Refresh'} Token`}
          centered
        >
          <form onSubmit={passwordForm.onSubmit(handlePasswordConfirmation)}>
            <PasswordInput
              label='Current Password'
              placeholder='Enter your current password to confirm this action'
              autoComplete='current-password'
              {...passwordForm.getInputProps('currentPassword')}
              leftSection={<IconLock size='1rem' />}
              data-autofocus
            />

            <Group justify='flex-end' mt='md'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowPasswordModal(false);
                  passwordForm.reset();
                  setPendingAction(null);
                }}
              >
                Cancel
              </Button>
              <Button type='submit' leftSection={<IconCheck size='1rem' />}>
                {pendingAction === 'copy' ? 'Copy Token' : 'Refresh Token'}
              </Button>
            </Group>
          </form>
        </Modal>
      </AppShell>
    </>
  );
}
