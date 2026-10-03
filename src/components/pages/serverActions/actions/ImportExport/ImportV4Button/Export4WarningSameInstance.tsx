import { Export4 } from '@/lib/import/version4/validateExport';
import { useUserStore } from '@/lib/client/store/user';
import { Box, Checkbox, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function detectSameInstance(export4?: Export4 | null, currentUserId?: string) {
  if (!export4) return false;
  if (!currentUserId) return false;

  const idInExport = export4.data.users.find((user) => user.id === currentUserId);
  return !!idInExport;
}

export default function Export4WarningSameInstance({
  export4,
  sameInstanceAgree,
  setSameInstanceAgree,
}: {
  export4: Export4;
  sameInstanceAgree: boolean;
  setSameInstanceAgree: (sameInstanceAgree: boolean) => void;
}) {
  const { t } = useTranslation('serverActions');
  const currentUserId = useUserStore((state) => state.user?.id);
  const isSameInstance = detectSameInstance(export4, currentUserId);

  if (!isSameInstance) return null;

  return (
    <Box my='lg'>
      <Text size='md' c='red'>
        {t('importExport.v4.sameInstance.title')}
      </Text>
      <Text size='sm' c='dimmed'>
        {t('importExport.v4.sameInstance.description')}
      </Text>

      <Checkbox.Card
        checked={sameInstanceAgree}
        onClick={() => setSameInstanceAgree(!sameInstanceAgree)}
        radius='md'
        my='sm'
      >
        <Group wrap='nowrap' align='flex-start'>
          <Checkbox.Indicator m='md' />
          <Text my='sm'>{t('importExport.v4.sameInstance.agree')}</Text>
        </Group>
      </Checkbox.Card>
    </Box>
  );
}
