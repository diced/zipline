import { bytes } from '@/lib/bytes';
import { Metric } from '@/lib/db/models/metric';
import { Paper, ScrollArea, SimpleGrid, Skeleton, Table, Text } from '@mantine/core';
import TypesPieChart from './TypesPieChart';

function SkeletonText() {
  return (
    <Table.Td>
      <Skeleton animate>
        <Text>...</Text>
      </Skeleton>
    </Table.Td>
  );
}

export function StatsTablesSkeleton() {
  return (
    <>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper radius='md' withBorder>
          <ScrollArea.Autosize mah={500} type='auto'>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Files</Table.Th>
                  <Table.Th>Storage Used</Table.Th>
                  <Table.Th>Views</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...Array(5)].map((_, i) => (
                  <Table.Tr key={i}>
                    <SkeletonText />
                    <SkeletonText />
                    <SkeletonText />
                    <SkeletonText />
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </Paper>

        <Paper withBorder mah={500} radius='md'>
          <ScrollArea.Autosize mah={500} type='auto'>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>URLs</Table.Th>
                  <Table.Th>Views</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...Array(5)].map((_, i) => (
                  <Table.Tr key={i}>
                    <SkeletonText />
                    <SkeletonText />
                    <SkeletonText />
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </Paper>

        <Paper withBorder radius='md'>
          <ScrollArea.Autosize mah={500} type='auto'>
            <Table highlightOnHover stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Files</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[...Array(5)].map((_, i) => (
                  <Table.Tr key={i}>
                    <SkeletonText />
                    <SkeletonText />
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </Paper>

        <Paper withBorder p='sm'>
          <Skeleton height={500} />
        </Paper>
      </SimpleGrid>
    </>
  );
}

export default function StatsTables({ latest }: { latest: Metric | null }) {
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
                  <Table.Th>User</Table.Th>
                  <Table.Th>Files</Table.Th>
                  <Table.Th>Storage Used</Table.Th>
                  <Table.Th>Views</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recent.data.filesUsers
                  .sort((a, b) => b.sum - a.sum)
                  .map((count, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{count.username ?? '[unknown]'}</Table.Td>
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
                  <Table.Th>User</Table.Th>
                  <Table.Th>URLs</Table.Th>
                  <Table.Th>Views</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recent.data.urlsUsers
                  .sort((a, b) => b.sum - a.sum)
                  .map((count, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{count.username ?? '[unknown]'}</Table.Td>
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
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Files</Table.Th>
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
