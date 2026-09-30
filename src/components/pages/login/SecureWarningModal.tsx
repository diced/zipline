import { Anchor, Code, Modal, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';

export default function SecureWarningModal({
  returnHttps,
  opened,
  onClose,
}: {
  returnHttps: boolean;
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('auth');

  return (
    <Modal opened={opened} onClose={onClose} title={t('secureWarning.title')} size='lg'>
      <Text>{returnHttps ? t('secureWarning.insecureClient') : t('secureWarning.insecureServer')}</Text>
      <Text mt='md'>
        {returnHttps ? (
          <SafeTrans t={t} i18nKey='secureWarning.resolveClient' components={{ code: <Code /> }} />
        ) : (
          <SafeTrans t={t} i18nKey='secureWarning.resolveServer' components={{ code: <Code /> }} />
        )}
      </Text>

      <Text mt='md'>
        <SafeTrans
          t={t}
          i18nKey='secureWarning.restart'
          components={{
            anchor: (
              <Anchor
                underline='always'
                href='https://zipline.diced.sh/docs/config/settings#more-about-return-https-urls'
              />
            ),
          }}
        />
      </Text>
    </Modal>
  );
}
