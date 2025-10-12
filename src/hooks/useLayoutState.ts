import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export function useLayoutState() {
  const [opened, setOpened] = useState(false);
  const [navbarCollapsed, setNavbarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showLogoText, setShowLogoText] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'copy' | 'refresh' | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = () => {
      setOpened(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    if (!navbarCollapsed) {
      setShowLogoText(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(navbarCollapsed));
    }

    if (navbarCollapsed) {
      const timer = setTimeout(() => {
        setShowLogoText(false);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShowLogoText(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [navbarCollapsed]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return {
    opened,
    setOpened,
    navbarCollapsed,
    setNavbarCollapsed,
    showLogoText,
    setShowLogoText,
    showPasswordModal,
    setShowPasswordModal,
    pendingAction,
    setPendingAction,
    isScrolled,
  };
}
