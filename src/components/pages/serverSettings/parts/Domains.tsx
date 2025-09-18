import { Response } from '@/lib/api/response';
import { Button, Group, LoadingOverlay, Paper, SimpleGrid, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';

const DOMAIN_REGEX =
  /^[a-zA-Z0-9][a-zA-Z0-9-_]{0,61}[a-zA-Z0-9]{0,1}\.([a-zA-Z]{1,6}|[a-zA-Z0-9-]{1,30}\.[a-zA-Z]{2,30})$/gim;

export default function Domains({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const navigate = useNavigate();

  const [domains, setDomains] = useState<string[]>([]);
  const form = useForm({
    initialValues: {
      newDomain: '',
    },
  });

  const onSubmit = settingsOnSubmit(navigate, form);

  useEffect(() => {
    if (!data) return;
    const domainsData = Array.isArray(data.settings.domains)
      ? data.settings.domains.map((d) => String(d))
      : [];
    setDomains(domainsData);
  }, [data]);

  const addDomain = () => {
    const { newDomain } = form.values;
    if (!newDomain) return;

    if (!DOMAIN_REGEX.test(newDomain)) {
      return form.setFieldError('newDomain', 'Invalid Domain');
    }

    const updatedDomains = [...domains, newDomain.trim()];
    setDomains(updatedDomains);
    form.setValues({ newDomain: '' });
    onSubmit({ domains: updatedDomains });
  };

  const removeDomain = (index: number) => {
    const updatedDomains = domains.filter((_, i) => i !== index);
    setDomains(updatedDomains);
    onSubmit({ domains: updatedDomains });
  };

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Domains</Title>

      <Group mt='md' align='flex-end'>
        <TextInput
          label='Domain'
          description='Enter a domain name (e.g. example.com)'
          placeholder='example.com'
          {...form.getInputProps('newDomain')}
        />
        <Button onClick={addDomain} leftSection={<IconPlus size='1rem' />}>
          Add Domain
        </Button>
      </Group>

      <SimpleGrid mt='md' cols={{ base: 1, sm: 2, md: 3 }} spacing='md' verticalSpacing='md'>
        {domains.map((domain, index) => (
          <Paper
            key={index}
            withBorder
            p='md'
            radius='md'
            shadow='xs'
            style={{
              background: 'rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: 64,
            }}
          >
            <Group justify='space-between' align='center' wrap='nowrap'>
              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                  fontSize: 16,
                }}
              >
                {domain}
              </div>
              <Button
                variant='subtle'
                color='red'
                size='xs'
                onClick={() => removeDomain(index)}
                px={8}
                style={{
                  aspectRatio: '1/1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconTrash size='1rem' />
              </Button>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    </Paper>
  );
}
