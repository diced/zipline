import { bytes } from '@/lib/bytes';
import { Metric } from '@/lib/db/models/metric';
import { Paper, SimpleGrid, Table } from '@mantine/core';
import TypesPieChart from './TypesPieChart';

export default function StatsTables({ data }: { data: Metric[] }) {
  if (!data.length) return null;

  const recent = data[0]; // it is sorted by desc so 0 is the first one.

  return (
    <>
      <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <Paper radius='sm' withBorder>
          <Table highlightOnHover>
            <thead>
              <tr>
                <th>User</th>
                <th>Files</th>
                <th>Storage Used</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {recent.data.filesUsers.map((count, i) => (
                <tr key={i}>
                  <td>{count.username}</td>
                  <td>{count.sum}</td>
                  <td>{bytes(count.storage)}</td>
                  <td>{count.views}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Paper>

        <Paper radius='sm' withBorder>
          <Table highlightOnHover>
            <thead>
              <tr>
                <th>User</th>
                <th>URLs</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {recent.data.urlsUsers.map((count, i) => (
                <tr key={i}>
                  <td>{count.username}</td>
                  <td>{count.sum}</td>
                  <td>{count.views}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Paper>

        <Paper radius='sm' withBorder>
          <Table highlightOnHover>
            <thead>
              <tr>
                <th>Type</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {recent.data.types.map((count, i) => (
                <tr key={i}>
                  <td>{count.type}</td>
                  <td>{count.sum}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Paper>

        <Paper radius='sm' withBorder p='sm'>
          <TypesPieChart metric={recent} />
        </Paper>
      </SimpleGrid>
    </>
  );
}
