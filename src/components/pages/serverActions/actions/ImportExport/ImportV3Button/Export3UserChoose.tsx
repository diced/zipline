import { Export3 } from '@/lib/import/version3/validateExport';
import { Avatar, Box, Group, Radio, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';

export default function Export3UserChoose({
  export3,
  setImportFrom,
  importFrom,
}: {
  export3: Export3;
  setImportFrom: (importFrom: string) => void;
  importFrom: string;
}) {
  const { t } = useTranslation('serverActions');
  const users = Object.entries(export3.users);

  return (
    <Box my='lg'>
      <Text size='md'>{t('importExport.userChoose.title')}</Text>
      <Text size='sm' c='dimmed'>
        <SafeTrans t={t} i18nKey='importExport.v3.userChoose.description' components={{ b: <b /> }} />
      </Text>

      <Radio.Group value={importFrom} onChange={(value) => setImportFrom(value)} name='importFrom'>
        {users.map(([id, user]) => (
          <Radio.Card key={id} value={id} my='sm'>
            <Group wrap='nowrap' align='flex-start'>
              <Radio.Indicator m='md' />
              {user.avatar && <Avatar my='md' src={user.avatar} alt={user.username} radius='sm' />}
              <Stack gap={0}>
                <Text my='sm'>{user.username}</Text>{' '}
                {user.super_administrator && (
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
