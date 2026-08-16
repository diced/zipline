import { Response } from '@/lib/api/response';
import { Invite } from '@/lib/db/models/invite';
import { Center, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import useSWR from 'swr';
import InviteCard from '../InviteCard';
import { useState } from 'react';
import QRCodeModal from '@/components/QRCodeModal';

export default function InviteGridView() {
  const { data: invites, isLoading } =
    useSWR<Extract<Response['/api/auth/invites'], Invite[]>>('/api/auth/invites');

  const [qrOpen, setQrOpen] = useState<Invite | null>(null);

  return (
    <>
      <QRCodeModal
        opened={!!qrOpen}
        onClose={() => setQrOpen(null)}
        url={qrOpen ? `/invite/${qrOpen.code}` : ''}
      />

      {isLoading ? (
        <SimpleGrid
          my='sm'
          spacing='md'
          cols={{
            base: 1,
            md: 2,
            lg: 4,
          }}
          pos='relative'
        >
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height={120} animate />
          ))}
        </SimpleGrid>
      ) : (invites?.length ?? 0) !== 0 ? (
        <SimpleGrid
          my='sm'
          spacing='md'
          cols={{
            base: 1,
            md: 2,
            lg: 4,
          }}
          pos='relative'
        >
          {invites?.map((invite) => (
            <InviteCard setQrOpen={setQrOpen} key={invite.id} invite={invite} />
          ))}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconLink size='2rem' />
                <Title order={2}>No invites found</Title>
              </Group>
              <Text size='sm' c='dimmed'>
                Create an invite to see them here.
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
