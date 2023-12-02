import { bytes } from '@/lib/bytes';
import { Metric } from '@/lib/db/models/metric';
import { Paper, SimpleGrid, Table } from '@mantine/core';
import TypesPieChart from './TypesPieChart';

export default function StatsTables({ data }: { data: Metric[] }) {
  if (!data.length) return null;

  const recent = data[0]; // it is sorted by desc so 0 is the first one.

  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper radius='sm' withBorder>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Files</Table.Th>
                <Table.Th>Storage Used</Table.Th>
                <Table.Th>Views</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recent.data.filesUsers.map((count, i) => (
                <Table.Tr key={i}>
                  <Table.Td>{count.username}</Table.Td>
                  <Table.Td>{count.sum}</Table.Td>
                  <Table.Td>{bytes(count.storage)}</Table.Td>
                  <Table.Td>{count.views}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper radius='sm' withBorder>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>URLs</Table.Th>
                <Table.Th>Views</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recent.data.urlsUsers.map((count, i) => (
                <Table.Tr key={i}>
                  <Table.Td>{count.username}</Table.Td>
                  <Table.Td>{count.sum}</Table.Td>
                  <Table.Td>{count.views}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper radius='sm' withBorder>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Files</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recent.data.types.map((count, i) => (
                <Table.Tr key={i}>
                  <Table.Td>{count.type}</Table.Td>
                  <Table.Td>{count.sum}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper radius='sm' withBorder p='sm'>
          <TypesPieChart metric={recent} />
        </Paper>
      </SimpleGrid>
    </>
  );
}
