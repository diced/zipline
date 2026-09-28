import { Button, Collapse, Container, Text, Title } from '@mantine/core';
import { IconReload } from '@tabler/icons-react';
import GenericError from './GenericError';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ReloadPage() {
  const { t } = useTranslation('layout');
  const [view, setView] = useState(false);

  return (
    <Container my='lg'>
      <Title order={3}>{t('errors.reload.title')}</Title>

      <Text size='lg'>{t('errors.reload.message')}</Text>

      <Button
        leftSection={<IconReload size='1rem' />}
        mr='sm'
        mt='md'
        onClick={() => window.location.reload()}
      >
        {t('errors.reload.button')}
      </Button>

      <Button variant='subtle' mt='md' onClick={() => setView((v) => !v)}>
        {t('errors.reload.why')}
      </Button>

      <Collapse expanded={view}>
        <GenericError
          title={t('errors.reload.errorTitle')}
          message={t('errors.reload.errorMessage')}
          details={{}}
        />
      </Collapse>
    </Container>
  );
}
