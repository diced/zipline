import type { Response } from '@/lib/api/response';
import type { SafeConfig } from '@/lib/config/safe';
import useAvatar from '@/lib/hooks/useAvatar';
import useLogin from '@/lib/hooks/useLogin';
import { isAdministrator } from '@/lib/role';
import {
  AppShell,
  Burger,
  Button,
  Menu,
  Avatar,
  Box,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useModals } from '@mantine/modals';
import {
  IconChevronDown,
  IconClipboardCopy,
  IconRefreshDot,
  IconSettingsFilled,
  IconAdjustments,
  IconLogout,
} from '@tabler/icons-react';
import Link from 'next/link';
import styles from '../Layout.module.css';
import VersionBadge from '../VersionBadge';

interface LayoutHeaderProps {
  opened: boolean;
  setOpened: (opened: boolean | ((prev: boolean) => boolean)) => void;
  navbarCollapsed: boolean;
  isScrolled: boolean;
  hasCustomBackground: boolean;
  config: SafeConfig;
  setPendingAction: (action: 'copy' | 'refresh' | null) => void;
  setShowPasswordModal: (show: boolean) => void;
}

export function LayoutHeader({
  opened,
  setOpened,
  navbarCollapsed,
  isScrolled,
  hasCustomBackground,
  config,
  setPendingAction,
  setShowPasswordModal,
}: LayoutHeaderProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const { user } = useLogin();
  const { avatar } = useAvatar();
  const modals = useModals();

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
    <AppShell.Header
      px='md'
      className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''} ${navbarCollapsed ? styles.headerCollapsed : styles.headerExpanded} ${hasCustomBackground ? styles.headerWithBackground : ''}`}
      style={{
        backdropFilter: 'blur(8px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        background: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        borderBottom: colorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.3)',
      }}
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
        </div>
        <div className={styles.menuEnhancedWrapper}>
          <Menu
            shadow='md'
            width={200}
            withinPortal={true}
            floatingStrategy="fixed"
            styles={{
              dropdown: {
                transform: 'translateX(20px)',
              }
            }}
          >
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

            <Menu.Dropdown
              className={styles.accountMenuDropdown}
              style={{
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                background: colorScheme === 'dark' ? 'rgba(26, 27, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                border: colorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
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
      </div>
    </AppShell.Header>
  );
}
