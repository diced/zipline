import PasswordModal from '@/components/pages/view/PasswordModal';
import SafeTrans from '@/components/SafeTrans';
import { useSsrData } from '@/components/ZiplineSSRProvider';
import type { ViewUrlData } from '@/lib/ssr/viewData';
import { formatRootUrl } from '@/lib/url';
import { Anchor } from '@mantine/core';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function ViewUrlId() {
  const { t } = useTranslation('view');
  const data = useSsrData<ViewUrlData>();

  const requiresPassword = data?.requiresPassword;
  const destination = data?.url.destination;

  useEffect(() => {
    if (!requiresPassword && destination) window.location.href = destination;
  }, [destination, requiresPassword]);

  if (!data) return null;

  const { url } = data;

  return requiresPassword ? (
    <PasswordModal
      type='url'
      id={url.id}
      onUnlock={(token) => window.location.replace(formatRootUrl('/view/url', url.id, { token }))}
    />
  ) : (
    <p>
      <SafeTrans
        t={t}
        i18nKey='url.redirecting'
        values={{ destination: url.destination! }}
        components={{ anchor: <Anchor href={url.destination!} /> }}
      />
    </p>
  );
}
