import HighlightCode from '@/components/render/code/HighlightCode';
import { bytes } from '@/lib/bytes';
import { Export4 } from '@/lib/import/version4/validateExport';
import {
  Accordion,
  Anchor,
  Avatar,
  Button,
  Center,
  Collapse,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import {
  IconCheck,
  IconFiles,
  IconFolder,
  IconGraphFilled,
  IconLink,
  IconTag,
  IconTagPlus,
  IconTarget,
  IconUsers,
  IconVersions,
  IconX,
} from '@tabler/icons-react';

const ROLE_KEYS = {
  USER: 'importExport.details.roles.user',
  ADMIN: 'importExport.details.roles.admin',
  SUPERADMIN: 'importExport.details.roles.superAdmin',
} as const;

function findOauthProviders(export4: Export4, userId: string) {
  return export4.data.userOauthProviders.filter((provider) => provider.userId === userId);
}

function findUser(export4: Export4, userId: string) {
  return export4.data.users.find((user) => user.id === userId);
}

function TextDetail({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <span>
      <b>{name}</b> {children}
    </span>
  );
}

export default function Export4Details({ export4 }: { export4: Export4 }) {
  const { t } = useTranslation(['serverActions', 'common']);
  const [envOpened, { toggle: toggleEnv }] = useDisclosure(false);
  const [osOpened, { toggle: toggleOs }] = useDisclosure(false);

  const [reqId, reqUsername] = export4.request.user.split(':').map((s) => s.trim());

  const envRows = Object.entries(export4.request.env).map(([key, value]) => (
    <Table.Tr key={key}>
      <Table.Td ff='monospace'>{key}</Table.Td>
      <Table.Td ff='monospace'>{value}</Table.Td>
    </Table.Tr>
  ));

  const osRows = Object.entries(export4.request.os).map(([key, value]) => (
    <Table.Tr key={key}>
      <Table.Td ff='monospace'>{key}</Table.Td>
      <Table.Td ff='monospace'>{String(value)}</Table.Td>
    </Table.Tr>
  ));

  const userRows = export4.data.users.map((user, i) => (
    <Table.Tr key={i}>
      <Table.Td>{user.avatar ? <Avatar src={user.avatar} size={24} radius='sm' /> : ''}</Table.Td>
      <Table.Td>{user.id}</Table.Td>
      <Table.Td>{user.username}</Table.Td>
      <Table.Td>{user.password ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{t(ROLE_KEYS[user.role])}</Table.Td>
      <Table.Td>
        {findOauthProviders(export4, user.id)
          .map((x) => x.provider.toLowerCase())
          .join(', ')}
      </Table.Td>
      <Table.Td>
        {export4.data.userQuotas.find((x) => x.userId === user.id) ? (
          <IconCheck size='1rem' />
        ) : (
          <IconX size='1rem' />
        )}
      </Table.Td>
      <Table.Td>{export4.data.userPasskeys.filter((x) => x.userId === user.id).length}</Table.Td>
    </Table.Tr>
  ));

  const userOauthProvidersRows = export4.data.userOauthProviders.map((provider, i) => (
    <Table.Tr key={i}>
      <Table.Td>
        {findUser(export4, provider.userId)?.username ?? <i>{t('importExport.details.unknown')}</i>}
      </Table.Td>
      <Table.Td>{provider.provider.toLowerCase()}</Table.Td>
      <Table.Td>{provider.username}</Table.Td>
      <Table.Td>{provider.oauthId}</Table.Td>
    </Table.Tr>
  ));

  const fileRows = export4.data.files.map((file, i) => (
    <Table.Tr key={i}>
      <Table.Td>{file.name}</Table.Td>
      <Table.Td>{new Date(file.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>{file.password ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{bytes(file.size)}</Table.Td>
      <Table.Td>
        {file.userId ? (
          (findUser(export4, file.userId)?.username ?? <i>{t('importExport.details.unknown')}</i>)
        ) : (
          <i>{t('importExport.details.unknown')}</i>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const folderRows = export4.data.folders.map((folder, i) => (
    <Table.Tr key={i}>
      <Table.Td>{folder.name}</Table.Td>
      <Table.Td>
        {folder.userId ? (
          (findUser(export4, folder.userId)?.username ?? <i>{t('importExport.details.unknown')}</i>)
        ) : (
          <i>{t('importExport.details.unknown')}</i>
        )}
      </Table.Td>
      <Table.Td>{folder.public ? t('common:actions.yes') : t('common:actions.no')}</Table.Td>
      <Table.Td>{new Date(folder.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>{folder.files.length}</Table.Td>
    </Table.Tr>
  ));

  const urlRows = export4.data.urls.map((url, i) => (
    <Table.Tr key={i}>
      <Table.Td>{url.code}</Table.Td>
      <Table.Td>
        {url.userId ? (
          (findUser(export4, url.userId)?.username ?? <i>{t('importExport.details.unknown')}</i>)
        ) : (
          <i>{t('importExport.details.unknown')}</i>
        )}
      </Table.Td>
      <Table.Td>
        <Anchor href={url.destination}>{url.destination}</Anchor>
      </Table.Td>
      <Table.Td>{url.vanity ?? ''}</Table.Td>
      <Table.Td>{url.password ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{new Date(url.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>{url.enabled ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
    </Table.Tr>
  ));

  const invitesRows = export4.data.invites.map((invite, i) => (
    <Table.Tr key={i}>
      <Table.Td>{invite.code}</Table.Td>
      <Table.Td>
        {invite.inviterId ? (
          (findUser(export4, invite.inviterId)?.username ?? <i>{t('importExport.details.unknown')}</i>)
        ) : (
          <i>{t('importExport.details.unknown')}</i>
        )}
      </Table.Td>
      <Table.Td>{new Date(invite.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>{invite.uses}</Table.Td>
    </Table.Tr>
  ));

  const tagsRows = export4.data.userTags.map((tag, i) => (
    <Table.Tr key={i}>
      <Table.Td>
        {tag.userId ? (
          (findUser(export4, tag.userId)?.username ?? <i>{t('importExport.details.unknown')}</i>)
        ) : (
          <i>{t('importExport.details.unknown')}</i>
        )}
      </Table.Td>
      <Table.Td c={tag.color ?? undefined}>{tag.name}</Table.Td>
      <Table.Td>{tag.files.length}</Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Text c='dimmed' size='sm' my='xs'>
        {t('importExport.details.notice')}
      </Text>

      <Accordion defaultValue='version' variant='contained'>
        <Accordion.Item value='version'>
          <Accordion.Control icon={<IconVersions size='1rem' />}>
            {t('importExport.details.version.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap={2}>
              <TextDetail name={t('importExport.details.version.exportVersion')}>
                {export4.versions.export}
              </TextDetail>
              <TextDetail name='Node:'>{export4.versions.node}</TextDetail>
              <TextDetail name='Zipline:'>v{export4.versions.zipline}</TextDetail>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='request'>
          <Accordion.Control icon={<IconTarget size='1rem' />}>
            {t('importExport.details.request.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap={2}>
              <TextDetail name={t('importExport.details.request.user')}>
                {reqUsername} ({reqId})
              </TextDetail>

              <TextDetail name={t('importExport.details.request.at')}>
                {new Date(export4.request.date).toLocaleString()}
              </TextDetail>

              <Button my='xs' onClick={toggleOs} size='compact-sm'>
                {envOpened
                  ? t('importExport.details.request.hideOs')
                  : t('importExport.details.request.showOs')}
              </Button>

              <Collapse expanded={osOpened}>
                <Paper withBorder>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={300}>{t('importExport.details.table.key')}</Table.Th>
                        <Table.Th>{t('importExport.details.table.value')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{osRows}</Table.Tbody>
                  </Table>
                </Paper>

                <Button my='xs' onClick={toggleOs} size='compact-sm'>
                  {t('importExport.details.request.hideOs')}
                </Button>
              </Collapse>

              <Button my='xs' onClick={toggleEnv} size='compact-sm'>
                {envOpened
                  ? t('importExport.details.request.hideEnv')
                  : t('importExport.details.request.showEnv')}
              </Button>

              <Collapse expanded={envOpened}>
                <Paper withBorder>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={300}>{t('importExport.details.table.key')}</Table.Th>
                        <Table.Th>{t('importExport.details.table.value')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{envRows}</Table.Tbody>
                  </Table>
                </Paper>

                <Button my='xs' onClick={toggleEnv} size='compact-sm'>
                  {t('importExport.details.request.hideEnv')}
                </Button>
              </Collapse>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='users'>
          <Accordion.Control icon={<IconUsers size='1rem' />}>
            {t('importExport.details.users.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export4.data.users).length ? (
                <ScrollArea w='100%'>
                  <Table w='120%'>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th></Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.id')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.username')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.password')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.role')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.oauthProviders')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.quota')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.passkeys')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{userRows}</Table.Tbody>
                  </Table>
                </ScrollArea>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.users.empty')}</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='user_oauth_providers'>
          <Accordion.Control icon={<IconUsers size='1rem' />}>
            {t('importExport.details.oauthProviders.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export4.data.userOauthProviders).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.oauthProviders.columns.user')}</Table.Th>
                        <Table.Th>{t('importExport.details.oauthProviders.columns.provider')}</Table.Th>
                        <Table.Th>{t('importExport.details.oauthProviders.columns.oauthUsername')}</Table.Th>
                        <Table.Th>{t('importExport.details.oauthProviders.columns.oauthId')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{userOauthProvidersRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.oauthProviders.empty')}</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='files'>
          <Accordion.Control icon={<IconFiles size='1rem' />}>
            {t('importExport.details.files.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.files.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.files.columns.name')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.createdAt')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.password')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.size')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.owner')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{fileRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.files.empty')}</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='tags'>
          <Accordion.Control icon={<IconTag size='1rem' />}>
            {t('importExport.details.tags.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.userTags.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.tags.columns.user')}</Table.Th>
                        <Table.Th>{t('importExport.details.tags.columns.name')}</Table.Th>
                        <Table.Th>{t('importExport.details.tags.columns.files')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{tagsRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.tags.empty')}</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='folders'>
          <Accordion.Control icon={<IconFolder size='1rem' />}>
            {t('importExport.details.folders.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.folders.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.folders.columns.name')}</Table.Th>
                        <Table.Th>{t('importExport.details.folders.columns.owner')}</Table.Th>
                        <Table.Th>{t('importExport.details.folders.columns.public')}</Table.Th>
                        <Table.Th>{t('importExport.details.folders.columns.createdAt')}</Table.Th>
                        <Table.Th>{t('importExport.details.folders.columns.files')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{folderRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.folders.empty')}</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='urls'>
          <Accordion.Control icon={<IconLink size='1rem' />}>
            {t('importExport.details.urls.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.urls.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.urls.columns.code')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.owner')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.destination')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.vanity')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.password')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.createdAt')}</Table.Th>
                        <Table.Th>{t('common:status.enabled')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{urlRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.urls.empty')}</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='invites'>
          <Accordion.Control icon={<IconTagPlus size='1rem' />}>
            {t('importExport.details.invites.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.invites.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.invites.columns.code')}</Table.Th>
                        <Table.Th>{t('importExport.details.invites.columns.createdBy')}</Table.Th>
                        <Table.Th>{t('importExport.details.invites.columns.createdAt')}</Table.Th>
                        <Table.Th>{t('importExport.details.invites.columns.uses')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{invitesRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.invites.empty')}</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='metrics'>
          <Accordion.Control icon={<IconGraphFilled size='1rem' />}>
            {t('importExport.details.metrics.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap={2}>
              <TextDetail name={t('importExport.details.metrics.totalEntries')}>
                {export4.data.metrics.length}
              </TextDetail>

              <Text fw={700} c='dimmed' mb={-10}>
                {t('importExport.details.metrics.latestEntry')}
              </Text>
              <HighlightCode
                language='json'
                code={JSON.stringify(
                  export4.data.metrics.sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  )[export4.data.metrics.length - 1],
                  null,
                  2,
                )}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
