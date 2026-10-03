import { Container, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';
import FourOhFour from '../pages/404';

export default function GenericError({
  title,
  message,
  details,
}: {
  title?: string;
  message?: string;
  details?: Record<string, any>;
}) {
  const { t } = useTranslation('layout');
  const routerError: any = useRouteError();
  if (routerError?.status === 404) return <FourOhFour />;

  const routeError = JSON.parse(JSON.stringify(routerError, Object.getOwnPropertyNames(routerError)));

  console.error(routerError);

  return (
    <Container my='lg'>
      <Stack gap='xs'>
        <Title order={5}>{title || t('errors.generic.title')}</Title>
        <Text c='dimmed'>{message || t('errors.generic.message')}</Text>
        {details && (
          <Paper withBorder px={3} py={3}>
            <ScrollArea>
              <pre style={{ margin: 0 }}>{JSON.stringify({ routeError, details }, null, 2)}</pre>
            </ScrollArea>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
