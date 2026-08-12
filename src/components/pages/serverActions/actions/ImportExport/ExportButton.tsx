import { Alert, Box, Button, List, Modal, Code, Group, Divider, Checkbox, Pill } from '@mantine/core';
import { IconAlertCircle, IconDownload } from '@tabler/icons-react';
import { useState } from 'react';

export default function ExportButton() {
  const [open, setOpen] = useState(false);

  const [noMetrics, setNoMetrics] = useState(false);

  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} size='lg' title='Are you sure?'>
        <Box px='sm'>
          <p>The export provides a complete snapshot of Zipline’s data and environment. It includes:</p>

          <List>
            <List.Item>
              <b>Users:</b> Account information including usernames, optional passwords, avatars, roles, view
              settings, and optional TOTP secrets.
            </List.Item>

            <List.Item>
              <b>Passkeys:</b> Registered WebAuthn passkeys with creation dates, last-used timestamps, and
              credential registration data.
            </List.Item>

            <List.Item>
              <b>User Quotas:</b> Quota settings such as max bytes, max files, max URLs, and quota types.
            </List.Item>

            <List.Item>
              <b>OAuth Providers:</b> Linked OAuth accounts including provider type, tokens, and OAuth IDs.
            </List.Item>

            <List.Item>
              <b>User Tags:</b> Tags created by users, including names, colors, and associated file IDs.
            </List.Item>

            <List.Item>
              <b>Files:</b> Metadata about uploaded files including size, type, timestamps, expiration, views,
              password protection, owner, and folder association.
              <i> (Actual file contents are not included.)</i>
            </List.Item>

            <List.Item>
              <b>Folders:</b> Folder metadata including visibility settings, upload permissions, file lists,
              and ownership.
            </List.Item>

            <List.Item>
              <b>URLs:</b> Metadata for shortened URLs including destinations, vanity codes, view counts,
              passwords, and user assignments.
            </List.Item>

            <List.Item>
              <b>Thumbnails:</b> Thumbnail path and associated file ID.
              <i> (Image data is not included.)</i>
            </List.Item>

            <List.Item>
              <b>Invites:</b> Invite codes, creation/expiration dates, and usage counts.
            </List.Item>

            <List.Item>
              <b>Metrics:</b> System and usage statistics stored internally by Zipline.
            </List.Item>
          </List>

          <p>
            Additionally, the export includes <b>system-specific information</b>:
          </p>

          <List>
            <List.Item>
              <b>CPU Count:</b> The number of available processor cores.
            </List.Item>
            <List.Item>
              <b>Hostname:</b> The host system’s network identifier.
            </List.Item>
            <List.Item>
              <b>Architecture:</b> The hardware architecture (e.g., <Code>x64</Code>, <Code>arm64</Code>).
            </List.Item>
            <List.Item>
              <b>Platform:</b> The operating system platform (e.g., <Code>linux</Code>, <Code>darwin</Code>).
            </List.Item>
            <List.Item>
              <b>OS Release:</b> The OS or kernel version.
            </List.Item>
            <List.Item>
              <b>Environment Variables:</b> A full snapshot of environment variables at the time of export.
            </List.Item>
            <List.Item>
              <b>Versions:</b> The Zipline version, Node version, and export format version.
            </List.Item>
          </List>

          <Divider my='md' />

          <Checkbox
            label='Exclude Metrics Data'
            description='Exclude system and usage metrics from the export. This can reduce the export file size.'
            checked={noMetrics}
            onChange={() => setNoMetrics((val) => !val)}
          />

          <Divider my='md' />

          <Alert color='red' icon={<IconAlertCircle size='1rem' />} title='Warning' my='md'>
            This export contains a significant amount of sensitive data, including user accounts,
            authentication credentials, environment variables, and system metadata. Handle this file securely
            and do not share it with untrusted parties.
          </Alert>

          <Group grow my='md'>
            <Button onClick={() => setOpen(false)} color='red'>
              Cancel
            </Button>
            <Button
              component='a'
              href={`/api/server/export${noMetrics ? '?nometrics=true' : ''}`}
              target='_blank'
              rel='noreferrer'
              leftSection={<IconDownload size='1rem' />}
              onClick={() => setOpen(false)}
            >
              Download Export
            </Button>
          </Group>
        </Box>
      </Modal>

      <Button
        size='xl'
        fullWidth
        onClick={() => setOpen(true)}
        leftSection={<IconDownload size='1rem' />}
        rightSection={<Pill>V4</Pill>}
      >
        Export Data
      </Button>
    </>
  );
}
