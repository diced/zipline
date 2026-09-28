import { Export4 } from '@/lib/import/version4/validateExport';
import { Avatar, Box, Group, Radio, Stack, Text } from '@mantine/core';
import { Trans, useTranslation } from 'react-i18next';

export default function Export4UserChoose({
  export4,
  setImportFrom,
  importFrom,
}: {
  export4: Export4;
  setImportFrom: (importFrom: string) => void;
  importFrom: string;
}) {
  const { t } = useTranslation('serverActions');

  return (
    <Box my='lg'>
      <Text size='md'>{t('importExport.userChoose.title')}</Text>
      <Text size='sm' c='dimmed'>
        <Trans t={t} i18nKey='importExport.v4.userChoose.description' components={{ br: <br />, b: <b /> }} />
      </Text>

      <Radio.Group value={importFrom} onChange={(value) => setImportFrom(value)} name='importFrom'>
        {export4.data.users.map((user, i) => (
          <Radio.Card key={i} value={user.id} my='sm'>
            <Group wrap='nowrap' align='flex-start'>
              <Radio.Indicator m='md' />
              {user.avatar && <Avatar my='md' src={user.avatar} alt={user.username} radius='sm' />}
              <Stack gap={0}>
                <Text my='sm'>
                  {user.username} ({user.id})
                </Text>{' '}
                {user.role === 'SUPERADMIN' && (
                  <Text c='red' size='xs' mb='xs'>
                    {t('importExport.userChoose.superAdministrator')}
                  </Text>
                )}
              </Stack>
            </Group>
          </Radio.Card>
        ))}

        <Radio.Card value='' my='sm'>
          <Group wrap='nowrap' align='flex-start'>
            <Radio.Indicator m='md' />
            <Stack gap={0}>
              <Text my='sm'>{t('importExport.userChoose.noMerge.label')}</Text>{' '}
              <Text c='dimmed' size='xs' mb='xs'>
                {t('importExport.userChoose.noMerge.description')}
              </Text>
            </Stack>
          </Group>
        </Radio.Card>
      </Radio.Group>
    </Box>
  );
}
