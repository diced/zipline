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

function findOauthProviders(export4: Export4, userId: string) {
  return export4.data.userOauthProviders.filter((provider) => provider.userId === userId);
}

function findUser(export4: Export4, userId: string) {
  return export4.data.users.find((user) => user.id === userId);
}

function TextDetail({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <span>
      <b>{name}:</b> {children}
    </span>
  );
}

export default function Export3Details({ export4 }: { export4: Export4 }) {
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
      <Table.Td>{{ USER: 'User', ADMIN: 'Admin', SUPERADMIN: 'Super Admin' }[user.role]}</Table.Td>
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
      <Table.Td>{findUser(export4, provider.userId)?.username ?? <i>unknown</i>}</Table.Td>
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
        {file.userId ? (findUser(export4, file.userId)?.username ?? <i>unknown</i>) : <i>unknown</i>}
      </Table.Td>
    </Table.Tr>
  ));

  const folderRows = export4.data.folders.map((folder, i) => (
    <Table.Tr key={i}>
      <Table.Td>{folder.name}</Table.Td>
      <Table.Td>
        {folder.userId ? (findUser(export4, folder.userId)?.username ?? <i>unknown</i>) : <i>unknown</i>}
      </Table.Td>
      <Table.Td>{folder.public ? 'Yes' : 'No'}</Table.Td>
      <Table.Td>{new Date(folder.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>{folder.files.length}</Table.Td>
    </Table.Tr>
  ));

  const urlRows = export4.data.urls.map((url, i) => (
    <Table.Tr key={i}>
      <Table.Td>{url.code}</Table.Td>
      <Table.Td>
        {url.userId ? (findUser(export4, url.userId)?.username ?? <i>unknown</i>) : <i>unknown</i>}
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
          (findUser(export4, invite.inviterId)?.username ?? <i>unknown</i>)
        ) : (
          <i>unknown</i>
        )}
      </Table.Td>
      <Table.Td>{new Date(invite.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>{invite.uses}</Table.Td>
    </Table.Tr>
  ));

  const tagsRows = export4.data.userTags.map((tag, i) => (
    <Table.Tr key={i}>
      <Table.Td>
        {tag.userId ? (findUser(export4, tag.userId)?.username ?? <i>unknown</i>) : <i>unknown</i>}
      </Table.Td>
      <Table.Td c={tag.color ?? undefined}>{tag.name}</Table.Td>
      <Table.Td>{tag.files.length}</Table.Td>
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
              <TextDetail name='Export Version'>{export4.versions.export}</TextDetail>
              <TextDetail name='Node'>{export4.versions.node}</TextDetail>
              <TextDetail name='Zipline'>v{export4.versions.zipline}</TextDetail>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='request'>
          <Accordion.Control icon={<IconTarget size='1rem' />}>Request Details</Accordion.Control>
          <Accordion.Panel>
            <Stack gap={2}>
              <TextDetail name='User'>
                {reqUsername} ({reqId})
              </TextDetail>

              <TextDetail name='At'>{new Date(export4.request.date).toLocaleString()}</TextDetail>

              <Button my='xs' onClick={toggleOs} size='compact-sm'>
                {envOpened ? 'Hide' : 'Show'} OS Details
              </Button>

              <Collapse expanded={osOpened}>
                <Paper withBorder>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={300}>Key</Table.Th>
                        <Table.Th>Value</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{osRows}</Table.Tbody>
                  </Table>
                </Paper>

                <Button my='xs' onClick={toggleOs} size='compact-sm'>
                  Hide OS Details
                </Button>
              </Collapse>

              <Button my='xs' onClick={toggleEnv} size='compact-sm'>
                {envOpened ? 'Hide' : 'Show'} Environment
              </Button>

              <Collapse expanded={envOpened}>
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

                <Button my='xs' onClick={toggleEnv} size='compact-sm'>
                  Hide Environment
                </Button>
              </Collapse>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='users'>
          <Accordion.Control icon={<IconUsers size='1rem' />}>Users</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export4.data.users).length ? (
                <ScrollArea w='100%'>
                  <Table w='120%'>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th></Table.Th>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Username</Table.Th>
                        <Table.Th>Password</Table.Th>
                        <Table.Th>Role</Table.Th>
                        <Table.Th>OAuth Providers</Table.Th>
                        <Table.Th>Quota</Table.Th>
                        <Table.Th>Passkeys</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{userRows}</Table.Tbody>
                  </Table>
                </ScrollArea>
              ) : (
                <Center m='sm'>
                  <b>No users found (how?)</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='user_oauth_providers'>
          <Accordion.Control icon={<IconUsers size='1rem' />}>User OAuth Providers</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {Object.keys(export4.data.userOauthProviders).length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>User</Table.Th>
                        <Table.Th>Provider</Table.Th>
                        <Table.Th>OAuth Username</Table.Th>
                        <Table.Th>OAuth ID</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{userOauthProvidersRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>No user oauth providers found</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='files'>
          <Accordion.Control icon={<IconFiles size='1rem' />}>Files</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.files.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Created At</Table.Th>
                        <Table.Th>Password</Table.Th>
                        <Table.Th>Size</Table.Th>
                        <Table.Th>Owner</Table.Th>
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

        <Accordion.Item value='tags'>
          <Accordion.Control icon={<IconTag size='1rem' />}>User Tags</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.userTags.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>User</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Files</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{tagsRows}</Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Center m='sm'>
                  <b>No user tags found</b>
                </Center>
              )}
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='folders'>
          <Accordion.Control icon={<IconFolder size='1rem' />}>Folders</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.folders.length ? (
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
              {export4.data.urls.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Owner</Table.Th>
                        <Table.Th>Destination</Table.Th>
                        <Table.Th>Vanity</Table.Th>
                        <Table.Th>Password</Table.Th>
                        <Table.Th>Created At</Table.Th>
                        <Table.Th>Enabled</Table.Th>
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
          <Accordion.Control icon={<IconTagPlus size='1rem' />}>Invites</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder>
              {export4.data.invites.length ? (
                <Table.ScrollContainer minWidth={100}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Created By</Table.Th>
                        <Table.Th>Created At</Table.Th>
                        <Table.Th>Uses</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{invitesRows}</Table.Tbody>
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

        <Accordion.Item value='metrics'>
          <Accordion.Control icon={<IconGraphFilled size='1rem' />}>Metrics</Accordion.Control>
          <Accordion.Panel>
            <Stack gap={2}>
              <TextDetail name='Total Metrics Entries'>{export4.data.metrics.length}</TextDetail>

              <Text fw={700} c='dimmed' mb={-10}>
                Latest Metrics Entry:
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
