import RelativeDate from '@/components/RelativeDate';
import { Invite } from '@/lib/db/models/invite';
import { useSettingsStore } from '@/lib/client/store/settings';
import { ActionIcon, Anchor, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy, IconDots, IconQrcode, IconTrashFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { copyInviteUrl, deleteInvite } from './actions';

export default function InviteCard({
  invite,
  setQrOpen,
}: {
  invite: Invite;
  setQrOpen: (invite: Invite) => void;
}) {
  const { t } = useTranslation(['invites', 'common']);
  const clipboard = useClipboard();

  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);

  return (
    <>
      <Card withBorder shadow='sm'>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group justify='space-between'>
            <Anchor href={`/invite/${invite.code}`} target='_blank' fw={400}>
              {invite.code}
            </Anchor>

            <Menu withinPortal position='bottom-end' shadow='sm'>
              <Group gap={2}>
                <Menu.Target>
                  <ActionIcon variant='transparent'>
                    <IconDots size='1rem' />
                  </ActionIcon>
                </Menu.Target>
              </Group>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconCopy size='1rem' />}
                  onClick={() => copyInviteUrl(invite, clipboard)}
                >
                  {t('card.copyUrl')}
                </Menu.Item>
                <Menu.Item leftSection={<IconQrcode size='1rem' />} onClick={() => setQrOpen(invite)}>
                  {t('card.showQrCode')}
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrashFilled size='1rem' />}
                  color='red'
                  onClick={() => deleteInvite(warnDeletion, invite)}
                >
                  {t('common:actions.delete')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs'>
          <Stack gap={1}>
            <Text size='xs' c='dimmed'>
              <b>{t('card.createdBy')}</b> {invite.inviter!.username}
            </Text>
            <Text size='xs' c='dimmed'>
              <b>{t('card.created')}</b> <RelativeDate date={invite.createdAt} />
            </Text>
            {invite.expiresAt && (
              <Text size='xs' c='dimmed'>
                <b>{t('card.expires')}</b> <RelativeDate date={invite.expiresAt} />
              </Text>
            )}
            <Text size='xs' c='dimmed'>
              <b>{t('card.maxUses')}</b> {invite.maxUses ?? t('card.unlimited')}
            </Text>
            <Text size='xs' c='dimmed'>
              <b>{t('card.uses')}</b> {invite.uses.toLocaleString()}
            </Text>
          </Stack>
        </Card.Section>
      </Card>
    </>
  );
}
