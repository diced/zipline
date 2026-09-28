import { bytes } from '@/lib/bytes';
import { Metric } from '@/lib/db/models/metric';
import { Paper, ScrollArea, SimpleGrid, Table } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import TypesPieChart from './TypesPieChart';

export default function StatsTables({ latest }: { latest: Metric | null }) {
  const { t } = useTranslation('metrics');

  if (!latest) return null;

  const recent = latest;

  if (recent.data.filesUsers.length === 0 || recent.data.urlsUsers.length === 0) return null;

  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper radius='md' withBorder>
          <ScrollArea.Autosize mah={500} type='auto' bdrs='md'>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('tables.columns.user')}</Table.Th>
                  <Table.Th>{t('tables.columns.files')}</Table.Th>
                  <Table.Th>{t('tables.columns.storageUsed')}</Table.Th>
                  <Table.Th>{t('tables.columns.views')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recent.data.filesUsers
                  .sort((a, b) => b.sum - a.sum)
                  .map((count, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{count.username ?? t('tables.unknownUser')}</Table.Td>
                      <Table.Td>{count.sum}</Table.Td>
                      <Table.Td>{bytes(count.storage)}</Table.Td>
                      <Table.Td>{count.views}</Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </Paper>

        <Paper radius='md' withBorder mah={500}>
          <ScrollArea.Autosize mah={500} type='auto' bdrs='md'>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('tables.columns.user')}</Table.Th>
                  <Table.Th>{t('tables.columns.urls')}</Table.Th>
                  <Table.Th>{t('tables.columns.views')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recent.data.urlsUsers
                  .sort((a, b) => b.sum - a.sum)
                  .map((count, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{count.username ?? t('tables.unknownUser')}</Table.Td>
                      <Table.Td>{count.sum}</Table.Td>
                      <Table.Td>{count.views}</Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </Paper>

        <Paper radius='md' withBorder>
          <ScrollArea.Autosize mah={500} type='auto' bdrs='md'>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('tables.columns.type')}</Table.Th>
                  <Table.Th>{t('tables.columns.files')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recent.data.types
                  .sort((a, b) => b.sum - a.sum)
                  .map((count, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{count.type}</Table.Td>
                      <Table.Td>{count.sum}</Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </Paper>

        <Paper radius='md' withBorder p='sm'>
          <TypesPieChart metric={recent} />
        </Paper>
      </SimpleGrid>
    </>
  );
}
