import HighlightCode from '@/components/render/code/HighlightCode';
import { bytes } from '@/lib/bytes';
import { findFilesByUser, findUser } from '@/lib/import/version3/find';
import { Export3 } from '@/lib/import/version3/validateExport';
import {
  Accordion,
  Anchor,
  Avatar,
  Button,
  Center,
  Collapse,
  Paper,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import {
  IconCheck,
  IconFiles,
  IconFolders,
  IconLink,
  IconQuestionMark,
  IconTags,
  IconTarget,
  IconUsers,
  IconVersions,
  IconX,
} from '@tabler/icons-react';

function TextDetail({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <span>
      <b>{name}</b> {children}
    </span>
  );
}

export default function Export3Details({ export3 }: { export3: Export3 }) {
  const { t } = useTranslation('serverActions');
  const [envOpened, { toggle: toggleEnv }] = useDisclosure(false);
  const [osOpened, { toggle: toggleOs }] = useDisclosure(false);

  const envRows = Object.entries(export3.request.env).map(([key, value]) => (
    <Table.Tr key={key}>
      <Table.Td>{key}</Table.Td>
      <Table.Td>{value}</Table.Td>
    </Table.Tr>
  ));

  const userRows = Object.entries(export3.users).map(([id, user]) => (
    <Table.Tr key={id}>
      <Table.Td>{user.username}</Table.Td>
      <Table.Td>{user.password ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{user.administrator ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{user.super_administrator ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{user.avatar ? <Avatar src={user.avatar} size={24} /> : ''}</Table.Td>
      <Table.Td>
        {user.oauth.length ? user.oauth.map((x) => x.provider.toLowerCase()).join(', ') : ''}
      </Table.Td>
      <Table.Td>{user.totp_secret ? <IconCheck size='1rem' /> : ''}</Table.Td>
      <Table.Td>{findFilesByUser(export3, id).length}</Table.Td>
    </Table.Tr>
  ));

  const fileRows = Object.entries(export3.files).map(([id, file]) => (
    <Table.Tr key={id}>
      <Table.Td>{file.name}</Table.Td>
      <Table.Td>{file.original_name}</Table.Td>
      <Table.Td>{file.type}</Table.Td>
      <Table.Td>{bytes(file.size as number)}</Table.Td>
      <Table.Td>
        {file.user ? findUser(export3, file.user)?.username : t('importExport.details.unknown')}
      </Table.Td>
      <Table.Td>{file.views}</Table.Td>
      <Table.Td>{new Date(file.created_at).toLocaleString()}</Table.Td>
    </Table.Tr>
  ));

  const folderRows = Object.entries(export3.folders).map(([id, folder]) => (
    <Table.Tr key={id}>
      <Table.Td>{folder.name}</Table.Td>
      <Table.Td>{findUser(export3, folder?.user)?.username ?? t('importExport.details.unknown')}</Table.Td>
      <Table.Td>{folder.public ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{new Date(folder.created_at).toLocaleString()}</Table.Td>
      <Table.Td>{findFilesByUser(export3, id).length}</Table.Td>
    </Table.Tr>
  ));

  const urlRows = Object.entries(export3.urls).map(([id, url]) => (
    <Table.Tr key={id}>
      <Table.Td>{url.code}</Table.Td>
      <Table.Td>{findUser(export3, url.user)?.username ?? t('importExport.details.unknown')}</Table.Td>
      <Table.Td>
        <Anchor href={url.destination} target='_blank' rel='noreferrer'>
          {url.destination}
        </Anchor>
      </Table.Td>
      <Table.Td>{url.vanity ?? ''}</Table.Td>
      <Table.Td>{new Date(url.created_at).toLocaleString()}</Table.Td>
    </Table.Tr>
  ));

  const invitesRows = Object.entries(export3.invites).map(([id, invite]) => (
    <Table.Tr key={id}>
      <Table.Td>{invite.code}</Table.Td>
      <Table.Td>
        {findUser(export3, invite.created_by_user ?? '')?.username ?? t('importExport.details.unknown')}
      </Table.Td>
      <Table.Td>{new Date(invite.created_at).toLocaleString()}</Table.Td>
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
                {export3.versions.export}
              </TextDetail>
              <TextDetail name='Node:'>{export3.versions.node}</TextDetail>
              <TextDetail name='Zipline:'>v{export3.versions.zipline}</TextDetail>
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
                {findUser(export3, export3.request.user)?.username ?? t('importExport.details.unknown')}
              </TextDetail>

              <TextDetail name={t('importExport.details.request.at')}>
                {new Date(export3.request.date).toLocaleString()}
              </TextDetail>

              <Button my='xs' onClick={toggleOs} size='compact-sm'>
                {envOpened
                  ? t('importExport.details.request.hideOs')
                  : t('importExport.details.request.showOs')}
              </Button>

              <Collapse expanded={osOpened}>
                <HighlightCode language='json' code={JSON.stringify(export3.request.os, null, 2)} />
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
              {Object.keys(export3.users).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.users.columns.username')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.passwordQuestion')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.admin')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.superAdmin')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.avatar')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.oauth')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.totp')}</Table.Th>
                        <Table.Th>{t('importExport.details.users.columns.files')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{userRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>{t('importExport.details.users.empty')}</b>
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
              {Object.keys(export3.files).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.files.columns.name')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.originalName')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.type')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.size')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.owner')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.views')}</Table.Th>
                        <Table.Th>{t('importExport.details.files.columns.createdAt')}</Table.Th>
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

        <Accordion.Item value='folders'>
          <Accordion.Control icon={<IconFolders size='1rem' />}>
            {t('importExport.details.folders.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export3.folders).length ? (
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
              {Object.keys(export3.urls).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.urls.columns.code')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.owner')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.destination')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.vanity')}</Table.Th>
                        <Table.Th>{t('importExport.details.urls.columns.createdAt')}</Table.Th>
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
          <Accordion.Control icon={<IconTags size='1rem' />}>
            {t('importExport.details.invites.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export3.invites).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>{t('importExport.details.invites.columns.code')}</Table.Th>
                        <Table.Th>{t('importExport.details.invites.columns.createdBy')}</Table.Th>
                        <Table.Th>{t('importExport.details.invites.columns.createdAt')}</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{invitesRows.length}</Table.Tbody>
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

        <Accordion.Item value='other'>
          <Accordion.Control icon={<IconQuestionMark size='1rem' />}>
            {t('importExport.details.other.title')}
          </Accordion.Control>
          <Accordion.Panel>
            <HighlightCode
              language='json'
              code={JSON.stringify(
                {
                  user_map: export3.user_map,
                  thumbnail_map: export3.thumbnail_map,
                  folder_map: export3.folder_map,
                  file_map: export3.file_map,
                  url_map: export3.url_map,
                  invite_map: export3.invite_map,
                  thumbnails: export3.thumbnails,
                },
                null,
                2,
              )}
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
