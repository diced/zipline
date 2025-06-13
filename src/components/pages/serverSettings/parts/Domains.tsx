import { Response } from '@/lib/api/response';
import { Button, Group, LoadingOverlay, Paper, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

type Domain = {
  domain: string;
  expiresAt: string | null;
};

export default function Domains({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const form = useForm({
    initialValues: {
      newDomain: '',
      newExpiresAt: '',
    },
  });

  const onSubmit = settingsOnSubmit(router, form);

  useEffect(() => {
    if (!data) return;

    const parsedDomains = typeof data.settings.domains === 'string' 
      ? JSON.parse(data.settings.domains)
      : data.settings.domains || [];
    setDomains(parsedDomains);
  }, [data]);

  const addDomain = () => {
    const { newDomain, newExpiresAt } = form.values;
    if (!newDomain) return;

    const updatedDomains = [
      ...domains,
      {
        domain: newDomain.trim(),
        expiresAt: newExpiresAt.trim() || null,
      },
    ];

    setDomains(updatedDomains);
    form.setValues({ newDomain: '', newExpiresAt: '' });
    onSubmit({ domains: JSON.stringify(updatedDomains) });
  };

  const removeDomain = (index: number) => {
    const updatedDomains = domains.filter((_, i) => i !== index);
    setDomains(updatedDomains);
    onSubmit({ domains: JSON.stringify(updatedDomains) });
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
        <TextInput
          label='Expiration Date'
          description='Optional expiration date (YYYY-MM-DD)'
          placeholder='2024-12-31'
          {...form.getInputProps('newExpiresAt')}
        />
        <Button onClick={addDomain} leftSection={<IconPlus size='1rem' />}>
          Add Domain
        </Button>
      </Group>

      <Group mt='md' gap='xs'>
        {domains.map((domain, index) => (
          <Paper key={index} withBorder p='xs' style={{ flex: 1 }}>
            <Group justify='space-between'>
              <div>
                <strong>{domain.domain}</strong>
                {domain.expiresAt && (
                  <div style={{ fontSize: '0.8em', color: 'gray' }}>
                    Expires: {domain.expiresAt}
                  </div>
                )}
              </div>
              <Button
                variant='subtle'
                color='red'
                size='xs'
                onClick={() => removeDomain(index)}
                px={8}
                style={{ aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconTrash size='1rem' />
              </Button>
            </Group>
          </Paper>
        ))}
      </Group>
    </Paper>
  );
} 