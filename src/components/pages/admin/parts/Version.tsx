import { VersionInfo } from '@/components/VersionBadge';
import useVersion from '@/lib/client/hooks/useVersion';
import { Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconVersions } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function Version() {
  const { version, isLoading } = useVersion();
  const { t } = useTranslation('serverActions');

  return (
    <Paper withBorder p='md' radius='md'>
      <Group gap='xs' mb='sm'>
        <IconVersions size='1.2rem' />
        <Title order={3}>{t('admin.version.title')}</Title>
      </Group>

      {isLoading ? (
        <Stack gap='sm'>
          <Skeleton height={18} animate />
          <Skeleton height={18} animate />
          <Skeleton height={60} animate />
        </Stack>
      ) : version ? (
        <VersionInfo version={version} />
      ) : (
        <Text size='xs' c='dimmed'>
          {t('admin.version.loadFailed')}
        </Text>
      )}
    </Paper>
  );
}
