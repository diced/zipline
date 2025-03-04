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
      <b>{name}:</b> {children}
    </span>
  );
}

export default function Export3Details({ export3 }: { export3: Export3 }) {
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
      <Table.Td>{file.user ? findUser(export3, file.user)?.username : 'unknown'}</Table.Td>
      <Table.Td>{file.views}</Table.Td>
      <Table.Td>{new Date(file.created_at).toLocaleString()}</Table.Td>
    </Table.Tr>
  ));

  const folderRows = Object.entries(export3.folders).map(([id, folder]) => (
    <Table.Tr key={id}>
      <Table.Td>{folder.name}</Table.Td>
      <Table.Td>{findUser(export3, folder?.user)?.username ?? 'unknown'}</Table.Td>
      <Table.Td>{folder.public ? <IconCheck size='1rem' /> : <IconX size='1rem' />}</Table.Td>
      <Table.Td>{new Date(folder.created_at).toLocaleString()}</Table.Td>
      <Table.Td>{findFilesByUser(export3, id).length}</Table.Td>
    </Table.Tr>
  ));

  const urlRows = Object.entries(export3.urls).map(([id, url]) => (
    <Table.Tr key={id}>
      <Table.Td>{url.code}</Table.Td>
      <Table.Td>{findUser(export3, url.user)?.username ?? 'unknown'}</Table.Td>
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
      <Table.Td>{findUser(export3, invite.created_by_user ?? '')?.username ?? 'unknown'}</Table.Td>
      <Table.Td>{new Date(invite.created_at).toLocaleString()}</Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Text c='dimmed' size='sm' my='xs'>
        This data is not sent to the server. It is parsed and displayed in the browser. Data is only sent to
        the server when you click the &quot;Import&quot; button.
      </Text>

      <Accordion defaultValue='version' variant='contained'>
        <Accordion.Item value='version'>
          <Accordion.Control icon={<IconVersions size='1rem' />}>Version Details</Accordion.Control>
          <Accordion.Panel>
            <Stack gap={2}>
              <TextDetail name='Export Version'>{export3.versions.export}</TextDetail>
              <TextDetail name='Node'>{export3.versions.node}</TextDetail>
              <TextDetail name='Zipline'>v{export3.versions.zipline}</TextDetail>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='request'>
          <Accordion.Control icon={<IconTarget size='1rem' />}>Request Details</Accordion.Control>
          <Accordion.Panel>
            <Stack gap={2}>
              <TextDetail name='User'>
                {findUser(export3, export3.request.user)?.username ?? 'unknown'}
              </TextDetail>

              <TextDetail name='At'>{new Date(export3.request.date).toLocaleString()}</TextDetail>

              <Button my='xs' onClick={toggleOs} size='compact-sm'>
                {envOpened ? 'Hide' : 'Show'} OS Details
              </Button>

              <Collapse in={osOpened}>
                <HighlightCode language='json' code={JSON.stringify(export3.request.os, null, 2)} />
              </Collapse>

              <Button my='xs' onClick={toggleEnv} size='compact-sm'>
                {envOpened ? 'Hide' : 'Show'} Environment
              </Button>

              <Collapse in={envOpened}>
                <Paper withBorder>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={300}>Key</Table.Th>
                        <Table.Th>Value</Table.Th>
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
          <Accordion.Control icon={<IconUsers size='1rem' />}>Users</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export3.users).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Username</Table.Th>
                        <Table.Th>Password?</Table.Th>
                        <Table.Th>Admin</Table.Th>
                        <Table.Th>Super Admin</Table.Th>
                        <Table.Th>Avatar</Table.Th>
                        <Table.Th>Oauth</Table.Th>
                        <Table.Th>2fa (totp)</Table.Th>
                        <Table.Th>Files</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{userRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>No users found (how?)</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='files'>
          <Accordion.Control icon={<IconFiles size='1rem' />}>Files</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export3.files).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Original Name</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Size</Table.Th>
                        <Table.Th>Owner</Table.Th>
                        <Table.Th>Views</Table.Th>
                        <Table.Th>Created At</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{fileRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>No files found</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='folders'>
          <Accordion.Control icon={<IconFolders size='1rem' />}>Folders</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export3.folders).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Owner</Table.Th>
                        <Table.Th>Public</Table.Th>
                        <Table.Th>Created At</Table.Th>
                        <Table.Th>Files</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{folderRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>No folders found</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='urls'>
          <Accordion.Control icon={<IconLink size='1rem' />}>Urls</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export3.urls).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Owner</Table.Th>
                        <Table.Th>Destination</Table.Th>
                        <Table.Th>Vanity</Table.Th>
                        <Table.Th>Created At</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{urlRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>No urls found</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='invites'>
          <Accordion.Control icon={<IconTags size='1rem' />}>Invites</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export3.invites).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Created By</Table.Th>
                        <Table.Th>Created At</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{invitesRows.length}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>No invites found</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='other'>
          <Accordion.Control icon={<IconQuestionMark size='1rem' />}>Other</Accordion.Control>
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
