import { Export4 } from '@/lib/import/version4/validateExport';
import { useUserStore } from '@/lib/client/store/user';
import { Box, Checkbox, Group, Text } from '@mantine/core';

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
  const currentUserId = useUserStore((state) => state.user?.id);
  const isSameInstance = detectSameInstance(export4, currentUserId);

  if (!isSameInstance) return null;

  return (
    <Box my='lg'>
      <Text size='md' c='red'>
        Same Instance Detected
      </Text>
      <Text size='sm' c='dimmed'>
        Detected that you are importing data from the same instance as the current running one. Proceeding
        with this import may lead to data conflicts or overwriting existing data. Please ensure that you
        understand the implications before continuing.
      </Text>

      <Checkbox.Card
        checked={sameInstanceAgree}
        onClick={() => setSameInstanceAgree(!sameInstanceAgree)}
        radius='md'
        my='sm'
      >
        <Group wrap='nowrap' align='flex-start'>
          <Checkbox.Indicator m='md' />
          <Text my='sm'>I agree, and understand the implications.</Text>
        </Group>
      </Checkbox.Card>
    </Box>
  );
}
