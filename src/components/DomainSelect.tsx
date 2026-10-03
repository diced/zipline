import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from './ConfigProvider';
import { Select, TextInput } from '@mantine/core';
import { IconGlobe } from '@tabler/icons-react';

export default function DomainSelect({
  onChange,
  ...props
}: React.ComponentProps<typeof Select> & { onChange?: (value: string) => void }) {
  const { t } = useTranslation('layout');
  const config = useConfig();

  const domains = useMemo(() => {
    const settingsDomains = config.domains;
    if (!settingsDomains) return [];
    if (!Array.isArray(settingsDomains)) return [];

    return settingsDomains;
  }, [config]);

  const selectData = [
    { value: '', label: t('domainSelect.default') },
    ...domains.map((domain) => ({
      value: domain,
      label: domain,
    })),
  ];

  if (domains.length === 0)
    return (
      <TextInput
        description={t('domainSelect.description')}
        leftSection={<IconGlobe size='1rem' />}
        placeholder='example.com'
        {...(onChange
          ? {
              onChange: (e) => onChange(e.currentTarget.value),
            }
          : {})}
        {...(props as React.ComponentProps<typeof TextInput>)}
      />
    );

  return (
    <Select
      data={selectData}
      description={t('domainSelect.description')}
      leftSection={<IconGlobe size='1rem' />}
      {...(onChange
        ? {
            onChange,
          }
        : {})}
      {...props}
    />
  );
}
