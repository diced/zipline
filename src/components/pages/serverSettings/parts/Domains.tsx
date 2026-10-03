import type { Response } from '@/lib/api/response';
import { ActionIcon, LoadingOverlay, Paper, Table, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Domains() {
  const { data, isLoading } = useServerSettings();

  return (
    <>
      <LoadingOverlay visible={isLoading} />
      {data ? <Form data={data} /> : null}
    </>
  );
}

function Form({ data }: { data: Response['/api/server/settings'] }) {
  const navigate = useNavigate();
  const { t } = useTranslation('serverSettings');
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    // using 'domains' here so that settingsOnSubmit picks up errors correctly
    initialValues: { domains: '' },
  });

  const submitSettings = settingsOnSubmit(navigate, form);

  const domains = data.settings.domains.map(String);

  async function updateDomains(nextDomains: string[]) {
    setSubmitting(true);

    try {
      const error = await submitSettings({ domains: nextDomains });
      if (!error) form.setFieldValue('domains', '');
    } catch (err: any) {
      form.setFieldError('domains', err?.message ?? err?.error ?? t('domains.errors.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const addDomain = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const domain = form.values.domains.trim();
    if (!domain) return;

    if (domains.includes(domain)) return form.setFieldError('domains', t('domains.errors.exists'));

    await updateDomains([...domains, domain]);
  };

  const removeDomain = async (domain: string) => {
    await updateDomains(domains.filter((d) => d !== domain));
  };

  return (
    <>
      <LoadingOverlay visible={submitting} />

      <form onSubmit={addDomain}>
        <TextInput
          description={t('domains.input.description')}
          placeholder='example.com'
          rightSection={
            <ActionIcon type='submit' variant='transparent' disabled={submitting}>
              <IconPlus size='1.25rem' />
            </ActionIcon>
          }
          {...form.getInputProps('domains')}
        />
      </form>

      {domains.length > 0 ? (
        <Paper withBorder p={0} mt='md'>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('domains.table.columns.domain')}</Table.Th>
                <Table.Th w={30}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {domains.map((domain) => (
                <Table.Tr key={domain}>
                  <Table.Td>
                    <Text fw={500} truncate>
                      {domain}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon color='red' onClick={() => removeDomain(domain)} disabled={submitting}>
                      <IconTrash size='1.25rem' />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      ) : (
        <Text mt='md' c='dimmed'>
          {t('domains.empty')}
        </Text>
      )}
    </>
  );
}
