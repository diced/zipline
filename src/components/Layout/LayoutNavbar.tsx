import type { Response } from '@/lib/api/response';
import type { SafeConfig } from '@/lib/config/safe';
import useLogin from '@/lib/hooks/useLogin';
import { isAdministrator } from '@/lib/role';
import {
  AppShell,
  Avatar,
  Box,
  Title,
  Divider,
  ScrollArea,
  NavLink,
  Menu,
  Group,
  ActionIcon,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import {
  IconHome,
  IconGraph,
  IconFiles,
  IconFolder,
  IconUpload,
  IconFileUpload,
  IconFileText,
  IconLink,
  IconShieldLockFilled,
  IconAdjustments,
  IconUsersGroup,
  IconTags,
  IconChevronRight,
  IconExternalLink,
  IconMenu2,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../Layout.module.css';
import { useLayoutState } from '@/hooks/useLayoutState';

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

interface LayoutNavbarProps {
  opened: boolean;
  navbarCollapsed: boolean;
  setNavbarCollapsed: (collapsed: boolean) => void;
  hasCustomBackground: boolean;
  config: SafeConfig;
}

export function LayoutNavbar({
  opened,
  navbarCollapsed,
  setNavbarCollapsed,
  hasCustomBackground,
  config,
}: LayoutNavbarProps) {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  const { user } = useLogin();
  const router = useRouter();
  const { showLogoText } = useLayoutState();

  return (
    <AppShell.Navbar
      hidden={!opened}
      zIndex={90}
      className={`${styles.navbar} ${styles.navbarBase} ${hasCustomBackground ? styles.navbarWithBackground : ''}`}
    >
      {/* Desktop logo section */}
      <Box visibleFrom='sm' className={styles.logoSection}>
        {config.website.titleLogo && (
          <Avatar
            src={config.website.titleLogo}
            alt='Zipline logo'
            radius='sm'
            size='md'
            className={styles.logoImage}
          />
        )}

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
      </Box>

      {/* Main navigation section */}
      <ScrollArea flex={1} type='never' className={`${styles.navbarContent} ${styles.navSection}`}>
        <div className={navbarCollapsed ? styles.navSectionCollapsed : ''}>
          <Box>
            {navLinks
              .filter((link) => !link.if || link.if(user as Response['/api/user']['user'], config))
              .map((link) => {
                if (!link.links) {
                  if (navbarCollapsed) {
                    return (
                      <div
                        key={link.label}
                        title={link.label}
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
                  // Handle links with children
                  if (navbarCollapsed) {
                    return (
                      <Menu
                        key={link.label}
                        position='right-start'
                        withinPortal={true}
                        transitionProps={{ duration: 0 }}
                        width={150}
                      >
                        <Menu.Target>
                          <div
                            title={link.label}
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
                        <Menu.Dropdown className={styles.collapsedMenuDropdown}>
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
          </Box>
        </div>
      </ScrollArea>

      {/* Bottom section with toggle button */}
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

      {/* External links section */}
      <Box className={styles.bottomSectionBase}>
        {config.website.externalLinks.length > 0 && (
          <Box className={styles.externalLinksContainer}>
            {config.website.externalLinks.map(({ name, url }, i) => {
              if (navbarCollapsed) {
                return (
                  <div
                    key={i}
                    title={name}
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
    </AppShell.Navbar>
  );
}
