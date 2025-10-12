import { useState, useEffect, useCallback, useMemo } from 'react';
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

  const [localShowLogoText, setLocalShowLogoText] = useState(!navbarCollapsed);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const [manuallyClosedSubmenu, setManuallyClosedSubmenu] = useState<string | null>(null);

  useEffect(() => {
    if (navbarCollapsed) {
      setExpandedSubmenu(null);
      setManuallyClosedSubmenu(null);
    }
  }, [navbarCollapsed]);

  useEffect(() => {
    if (hasUserInteracted) {
      if (navbarCollapsed) {
        setLocalShowLogoText(false);
      } else {
        const timer = setTimeout(() => {
          setLocalShowLogoText(true);
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      setLocalShowLogoText(!navbarCollapsed);
    }
  }, [navbarCollapsed, hasUserInteracted]);

  useEffect(() => {
    if (!navbarCollapsed) {
      const currentSubmenu = navLinks.find((link) => link.links && link.active(router.pathname));

      if (currentSubmenu && manuallyClosedSubmenu !== currentSubmenu.label) {
        setExpandedSubmenu(currentSubmenu.label);
      }
    }
  }, [router.pathname, navbarCollapsed, manuallyClosedSubmenu]);

  useEffect(() => {
    const currentSubmenu = navLinks.find((link) => link.links && link.active(router.pathname));

    if (currentSubmenu && manuallyClosedSubmenu && manuallyClosedSubmenu !== currentSubmenu.label) {
      setManuallyClosedSubmenu(null);
    }
  }, [router.pathname, manuallyClosedSubmenu]);

  const filteredNavLinks = useMemo(
    () => navLinks.filter((link) => !link.if || link.if(user as Response['/api/user']['user'], config)),
    [user, config],
  );

  const handleNavbarToggle = useCallback(() => {
    setHasUserInteracted(true);
    setNavbarCollapsed(!navbarCollapsed);
  }, [navbarCollapsed, setNavbarCollapsed]);

  const handleSubmenuToggle = useCallback(
    (linkLabel: string, opened: boolean) => {
      if (opened) {
        setExpandedSubmenu(linkLabel);
        if (manuallyClosedSubmenu === linkLabel) {
          setManuallyClosedSubmenu(null);
        }
      } else {
        setExpandedSubmenu(null);
        setManuallyClosedSubmenu(linkLabel);
      }
    },
    [manuallyClosedSubmenu],
  );

  const handleSubmenuClick = useCallback(
    (e: React.MouseEvent, linkLabel: string) => {
      if (expandedSubmenu === linkLabel) {
        e.preventDefault();
        setExpandedSubmenu(null);
        setManuallyClosedSubmenu(linkLabel);
      } else {
        setExpandedSubmenu(linkLabel);
        if (manuallyClosedSubmenu === linkLabel) {
          setManuallyClosedSubmenu(null);
        }
      }
    },
    [expandedSubmenu, manuallyClosedSubmenu],
  );

  const handleCollapsedSubmenuClick = useCallback(
    (e: React.MouseEvent, linkLabel: string) => {
      e.preventDefault();
      e.stopPropagation();
      setNavbarCollapsed(false);
      setTimeout(() => {
        setExpandedSubmenu(linkLabel);
      }, 0);
    },
    [setNavbarCollapsed],
  );

  const handleCollapsedNavClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(href);
    },
    [router],
  );

  const handleExternalLinkClick = useCallback((e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank');
  }, []);

  const getCollapsedItemStyle = useCallback(
    (isActive: boolean) => ({
      backgroundColor: isActive
        ? colorScheme === 'dark'
          ? theme.colors.dark[6]
          : theme.colors.gray[2]
        : 'transparent',
    }),
    [colorScheme, theme],
  );
  const getSubmenuCollapsedStyle = useCallback(
    (isActive: boolean) => ({
      cursor: 'pointer',
      backgroundColor: isActive
        ? colorScheme === 'dark'
          ? theme.colors.dark[6]
          : theme.colors.gray[2]
        : 'transparent',
    }),
    [colorScheme, theme],
  );

  const renderSubLinks = useCallback(
    (subLinks: NavLinks[]) =>
      subLinks
        .filter((sublink) => !sublink.if || sublink.if(user as Response['/api/user']['user'], config))
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
        )),
    [user, config, router.pathname],
  );

  const toggleButtonStyle = useMemo(
    () => ({
      display: 'flex',
      justifyContent: 'center',
      padding: navbarCollapsed ? '8px' : '10px',
      marginTop: '8px',
    }),
    [navbarCollapsed],
  );

  const externalLinkIconStyleCollapsed = useMemo(
    () => ({
      fontSize: '1.2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    [],
  );

  const externalLinkIconStyleExpanded = useMemo(
    () => ({
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: '4px',
    }),
    [],
  );

  return (
    <AppShell.Navbar
      hidden={!opened}
      zIndex={100}
      className={`${styles.navbar} ${styles.navbarBase} ${hasCustomBackground ? styles.navbarWithBackground : ''}`}
    >
      <Link
        href='/'
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          width: '100%',
        }}
      >
        <Box visibleFrom='sm' className={styles.logoSection} style={{ cursor: 'pointer' }}>
          {config.website.titleLogo && (
            <Avatar
              src={config.website.titleLogo}
              alt='logo'
              radius='sm'
              size='md'
              className={styles.logoImage}
            />
          )}{' '}
          <Title
            size={20}
            lineClamp={1}
            ta='center'
            className={`${styles.logoText} ${localShowLogoText ? styles.logoTextVisible : styles.logoTextHidden} ${!hasUserInteracted ? styles.logoTextNoAnimation : ''}`}
          >
            {config.website.title?.trim() || 'Zipline'}
          </Title>
        </Box>
      </Link>
      <Link
        href='/'
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          width: '100%',
        }}
      >
        <Box hiddenFrom='sm' p='md' pb='xs' style={{ cursor: 'pointer' }}>
          <Title size={24} style={{ marginBottom: 8 }}>
            {config.website.title?.trim() || 'Zipline'}
          </Title>
          <Divider />
        </Box>
      </Link>{' '}
      <ScrollArea flex={1} type='never' className={`${styles.navbarContent} ${styles.navSection}`}>
        <div className={navbarCollapsed ? styles.navSectionCollapsed : ''}>
          <Box>
            {filteredNavLinks.map((link) => {
              if (!link.links) {
                if (navbarCollapsed) {
                  return (
                    <div
                      key={link.label}
                      title={link.label}
                      className={`${styles.navItemCollapsed} ${styles.collapsedItem} ${styles.navItemCollapsedBase}`}
                      style={getCollapsedItemStyle(router.pathname === link.href)}
                      onClick={(e) => handleCollapsedNavClick(e, link.href || '')}
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
                if (navbarCollapsed) {
                  return (
                    <div
                      key={link.label}
                      title={`Click to expand ${link.label} menu`}
                      className={`${styles.navItemCollapsed} ${styles.collapsedItem} ${styles.navItemCollapsedBase}`}
                      style={getSubmenuCollapsedStyle(link.active(router.pathname))}
                      onClick={(e) => handleCollapsedSubmenuClick(e, link.label)}
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
                      active={link.active(router.pathname)}
                      className={`${styles.navItem} ${styles.navItemBase}`}
                      opened={expandedSubmenu === link.label}
                      onChange={(opened) => handleSubmenuToggle(link.label, opened)}
                      onClick={(e) => handleSubmenuClick(e, link.label)}
                    >
                      {renderSubLinks(link.links)}
                    </NavLink>
                  );
                }
              }
            })}
          </Box>
        </div>
      </ScrollArea>{' '}
      <Box mt='sm' visibleFrom='sm' style={toggleButtonStyle}>
        <ActionIcon
          variant='light'
          size='lg'
          onClick={handleNavbarToggle}
          className={`${styles.sidebarToggle} ${navbarCollapsed ? styles.sidebarToggleCollapsed : styles.sidebarToggleExpanded}`}
        >
          <Group gap='xs'>
            <IconMenu2 size='1.5rem' />
          </Group>
        </ActionIcon>
      </Box>
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
                    onClick={(e) => handleExternalLinkClick(e, url)}
                  >
                    {' '}
                    <Box style={externalLinkIconStyleCollapsed}>
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
                      <Box style={externalLinkIconStyleExpanded}>
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
