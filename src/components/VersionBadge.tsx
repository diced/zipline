import useVersion from '@/lib/client/hooks/useVersion';
import {
  Anchor,
  Badge,
  Button,
  Flex,
  Indicator,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

function DataDisplay({
  items,
}: {
  items: { label: string; value: string; href?: string; color?: string }[];
}) {
  return (
    <Paper withBorder p='sm'>
      <Stack gap='xs'>
        {items.map((item, index) => (
          <Flex justify='space-between' align='center' style={{ width: '100%' }} key={index}>
            <Text c='dimmed' fw='bolder' style={{ flex: 1 }}>
              {item.label}
            </Text>

            {item.href ? (
              <Anchor href={item.href} target='_blank'>
                {item.value}
              </Anchor>
            ) : (
              <Text c={item.color ?? undefined}>{item.value}</Text>
            )}
          </Flex>
        ))}
      </Stack>
    </Paper>
  );
}

function VersionButton({ text, children, href }: { href: string; text: string; children: React.ReactNode }) {
  return (
    <Button
      component='a'
      href={href}
      target='_blank'
      variant='filled'
      fullWidth
      color='blue'
      size='sm'
      mt='xs'
      leftSection={
        <Text size='sm' fw='bolder'>
          {text}
        </Text>
      }
    >
      {children}
    </Button>
  );
}

type VersionData = NonNullable<ReturnType<typeof useVersion>['version']>;

export function VersionInfo({ version }: { version: VersionData }) {
  return (
    <>
      {version.isLatest && <Text>Running the latest version of Zipline.</Text>}
      {version.isUpstream && (
        <Text>
          You are running an <b>unstable</b> version of Zipline. Upstream versions are not fully tested and
          may contain bugs.
        </Text>
      )}
      {!version.isLatest && !version.isUpstream && version.isRelease && (
        <Text>
          You are running an <b>outdated</b> version of Zipline. It is recommended to update to the{' '}
          <Anchor href={version.latest.url}>latest version</Anchor>.
        </Text>
      )}

      <Indicator processing position='middle-end' inline offset={-15} color='red' disabled={version.isLatest}>
        <Title order={3} my='sm'>
          Current Version
        </Title>
      </Indicator>

      <DataDisplay
        items={[
          {
            label: 'Version',
            value: version.version.tag!,
            href: `https://github.com/diced/zipline/releases/${version.version.tag}`,
          },
          {
            label: 'Commit',
            value: version.version.sha!.slice(0, 7)!,
            href: `https://github.com/diced/zipline/commit/${version.version.sha}`,
          },
          {
            label: 'Upstream?',
            value: version.isUpstream ? 'Yes' : 'No',
            color: version.isUpstream ? 'orange' : 'green',
          },
        ]}
      />

      {!version.isLatest && version.isUpstream && version.latest.commit && (
        <>
          <Title order={3} mt='sm'>
            Latest Commit Available
          </Title>
          <Text c='dimmed' size='sm' mb='sm'>
            This is only visible when running an upstream version.
          </Text>

          <DataDisplay
            items={[
              {
                label: 'Commit',
                value: version.latest.commit.sha!.slice(0, 7)!,
                href: `https://github.com/diced/zipline/commit/${version.latest.commit.sha}`,
              },
              {
                label: 'Available to update',
                value: version.latest.commit.pull ? 'Yes' : 'No',
                color: version.latest.commit.pull ? 'green' : 'red',
              },
            ]}
          />
        </>
      )}

      {!version.isLatest && version.isRelease && (
        <>
          <Title order={3} mt='sm'>
            {version.latest.tag} is available
          </Title>

          <VersionButton text='Changelogs' href={version.latest.url}>
            {version.latest.tag}
          </VersionButton>

          <VersionButton text='Update' href='https://zipline.diced.sh/docs/get-started/docker#updating'>
            {version.latest.tag}
          </VersionButton>
        </>
      )}
    </>
  );
}

export default function VersionBadge() {
  const { version, isLoading } = useVersion();
  const [opened, { open, close }] = useDisclosure(false);

  if (isLoading) return null;
  if (!version) return null;

  return (
    <>
      <Modal title='Zipline Version' opened={opened} onClose={close} size='lg'>
        <VersionInfo version={version} />
      </Modal>

      <Tooltip label='Click to view more version information'>
        <Badge
          onClick={open}
          style={{ cursor: 'pointer', textTransform: 'unset' }}
          mx='sm'
          my='xs'
          color={version.isLatest ? 'green' : 'red'}
          variant='dot'
          size='lg'
          radius='md'
        >
          {version.version?.tag}
        </Badge>
      </Tooltip>
    </>
  );
}
