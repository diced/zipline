import type { SafeConfig } from '@/lib/config/safe';
import { useSettingsStore } from '@/lib/store/settings';
import React from 'react';
import styles from './Layout.module.css';
import { AppShell, Paper } from '@mantine/core';
import { useShallow } from 'zustand/shallow';
import ConfigProvider from './ConfigProvider';
import { useLayoutState } from '@/hooks/useLayoutState';
import { LayoutHeader } from './Layout/LayoutHeader';
import { LayoutNavbar } from './Layout/LayoutNavbar';
import { TokenManagementModal } from './Layout/TokenManagementModal';

export default function Layout({ children, config }: { children: React.ReactNode; config: SafeConfig }) {
  const [backgroundType, backgroundImageUrl] = useSettingsStore(
    useShallow((state) => [state.settings.backgroundType, state.settings.backgroundImageUrl]),
  );

  const {
    opened,
    setOpened,
    navbarCollapsed,
    setNavbarCollapsed,
    showPasswordModal,
    setShowPasswordModal,
    pendingAction,
    setPendingAction,
    isScrolled,
  } = useLayoutState();

  const hasCustomBackground = Boolean(
    backgroundType === 'image' && backgroundImageUrl && backgroundImageUrl.trim() !== '',
  );

  return (
    <>
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
        <LayoutHeader
          opened={opened}
          setOpened={setOpened}
          navbarCollapsed={navbarCollapsed}
          isScrolled={isScrolled}
          hasCustomBackground={hasCustomBackground}
          config={config}
          setPendingAction={setPendingAction}
          setShowPasswordModal={setShowPasswordModal}
        />

        <LayoutNavbar
          opened={opened}
          navbarCollapsed={navbarCollapsed}
          setNavbarCollapsed={setNavbarCollapsed}
          hasCustomBackground={hasCustomBackground}
          config={config}
        />

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

        <TokenManagementModal
          showPasswordModal={showPasswordModal}
          setShowPasswordModal={setShowPasswordModal}
          pendingAction={pendingAction}
          setPendingAction={setPendingAction}
        />
      </AppShell>
    </>
  );
}
