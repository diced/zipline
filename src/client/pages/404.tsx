import { useTitle } from '@/lib/client/hooks/useTitle';
import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function FourOhFour() {
  const { t } = useTranslation('layout');
  useTitle('404');

  return (
    <Center h='100vh'>
      <Stack>
        <Title order={1}>404</Title>
        <Text c='dimmed' mt='-md'>
          {t('notFound.message')}
        </Text>

        <Button
          component={Link}
          to='/auth/login'
          color='blue'
          fullWidth
          leftSection={<IconArrowLeft size='1rem' />}
        >
          {t('notFound.goHome')}
        </Button>
      </Stack>
    </Center>
  );
}
