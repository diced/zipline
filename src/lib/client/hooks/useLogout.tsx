import { useUserStore } from '@/lib/client/store/user';
import { showNotification } from '@mantine/notifications';
import { IconLogout } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { mutate } from 'swr';

export function useLogout() {
  const setUser = useUserStore((state) => state.setUser);
  const navigate = useNavigate();
  const { t } = useTranslation('layout');

  const logout = async () => {
    showNotification({
      message: t('userMenu.loggingOut'),
      icon: <IconLogout size='1rem' />,
      autoClose: 700,
    });

    const res = await fetch('/api/auth/logout');
    if (res.ok) {
      setUser(null);
      await mutate('/api/user', null, false);
      navigate('/auth/login');
    }
  };

  return logout;
}
