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
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';

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
  const { t } = useTranslation(['layout', 'common']);

  return (
    <>
      {version.isLatest && <Text>{t('version.latest')}</Text>}
      {version.isUpstream && (
        <Text>
          <SafeTrans t={t} i18nKey='version.unstable' components={{ b: <b /> }} />
        </Text>
      )}
      {!version.isLatest && !version.isUpstream && version.isRelease && (
        <Text>
          <SafeTrans
            t={t}
            i18nKey='version.outdated'
            components={{ b: <b />, anchor: <Anchor href={version.latest.url} /> }}
          />
        </Text>
      )}

      <Indicator processing position='middle-end' inline offset={-15} color='red' disabled={version.isLatest}>
        <Title order={3} my='sm'>
          {t('version.current')}
        </Title>
      </Indicator>

      <DataDisplay
        items={[
          {
            label: t('version.fields.version'),
            value: version.version.tag!,
            href: `https://github.com/diced/zipline/releases/${version.version.tag}`,
          },
          {
            label: t('version.fields.commit'),
            value: version.version.sha!.slice(0, 7)!,
            href: `https://github.com/diced/zipline/commit/${version.version.sha}`,
          },
          {
            label: t('version.fields.upstream'),
            value: version.isUpstream ? t('common:actions.yes') : t('common:actions.no'),
            color: version.isUpstream ? 'orange' : 'green',
          },
        ]}
      />

      {!version.isLatest && version.isUpstream && version.latest.commit && (
        <>
          <Title order={3} mt='sm'>
            {t('version.latestCommit')}
          </Title>
          <Text c='dimmed' size='sm' mb='sm'>
            {t('version.latestCommitNote')}
          </Text>

          <DataDisplay
            items={[
              {
                label: t('version.fields.commit'),
                value: version.latest.commit.sha!.slice(0, 7)!,
                href: `https://github.com/diced/zipline/commit/${version.latest.commit.sha}`,
              },
              {
                label: t('version.fields.availableToUpdate'),
                value: version.latest.commit.pull ? t('common:actions.yes') : t('common:actions.no'),
                color: version.latest.commit.pull ? 'green' : 'red',
              },
            ]}
          />
        </>
      )}

      {!version.isLatest && version.isRelease && (
        <>
          <Title order={3} mt='sm'>
            {t('version.available', { tag: version.latest.tag })}
          </Title>

          <VersionButton text={t('version.changelogs')} href={version.latest.url}>
            {version.latest.tag}
          </VersionButton>

          <VersionButton
            text={t('version.update')}
            href='https://zipline.diced.sh/docs/get-started/docker#updating'
          >
            {version.latest.tag}
          </VersionButton>
        </>
      )}
    </>
  );
}

export default function VersionBadge() {
  const { t } = useTranslation('layout');
  const { version, isLoading } = useVersion();
  const [opened, { open, close }] = useDisclosure(false);

  if (isLoading) return null;
  if (!version) return null;

  return (
    <>
      <Modal title={t('version.modalTitle')} opened={opened} onClose={close} size='lg'>
        <VersionInfo version={version} />
      </Modal>

      <Tooltip label={t('version.tooltip')}>
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
