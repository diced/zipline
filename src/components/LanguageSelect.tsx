import { currentLanguage, setLanguage } from '@/lib/i18n';
import { LANGUAGE_NAMES, LANGUAGES } from '@/lib/i18n/languages';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconCheck, IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export default function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const active = i18n.resolvedLanguage ? currentLanguage() : undefined;

  return (
    <Menu shadow='md' width={180} position='bottom-end'>
      <Menu.Target>
        <Tooltip label={t('language.label')}>
          <ActionIcon variant='subtle' color='gray' size='lg' aria-label={t('language.label')}>
            <IconLanguage size='1.2rem' />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        {LANGUAGES.map((lng) => (
          <Menu.Item
            key={lng}
            lang={lng}
            onClick={() => setLanguage(lng)}
            rightSection={active === lng ? <IconCheck size='1rem' /> : null}
          >
            {LANGUAGE_NAMES[lng]}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
