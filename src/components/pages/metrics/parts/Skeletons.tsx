import { Paper, ScrollArea, SimpleGrid, Skeleton, Table, Text } from '@mantine/core';

export function StatsCardsSkeleton() {
  return (
    <SimpleGrid
      cols={{
        base: 1,
        md: 2,
        lg: 3,
      }}
      mb='sm'
    >
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} height={100} animate />
      ))}
    </SimpleGrid>
  );
}

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
