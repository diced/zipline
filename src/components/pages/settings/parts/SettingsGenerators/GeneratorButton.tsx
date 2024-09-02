import type { Config } from '@/lib/config/validate';
import {
  Anchor,
  Button,
  Code,
  Divider,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconDownload, IconEyeFilled, IconGlobe, IconPercentage, IconWriting } from '@tabler/icons-react';
import Link from 'next/link';
import React, { useReducer, useState } from 'react';
import { flameshot } from './generators/flameshot';
import { sharex } from './generators/sharex';
import { shell } from './generators/shell';
import { useUserStore } from '@/lib/store/user';

export type GeneratorOptions = {
  deletesAt: string | null;
  format: Config['files']['defaultFormat'] | 'default';
  imageCompressionPercent: number | null;
  maxViews: number | null;
  addOriginalName: boolean | null;
  overrides_returnDomain: string | null;
  noJson: boolean | null;

  // echo instead of copying
  unix_useEcho: boolean | null;
  // uses pbcopy instead of xclip
  mac_enableCompatibility: boolean | null;
  // uses wl-copy instead of xclip
  wl_enableCompatibility: boolean | null;
  // set XDG_CURRENT_DESKTOP=sway to fool flameshot
  wl_compositorUnsupported: boolean | null;
};

export const copier = (options: GeneratorOptions) => {
  if (options.unix_useEcho) return 'echo';
  if (options.mac_enableCompatibility) return 'pbcopy';
  if (options.wl_enableCompatibility) return 'wl-copy';
  return 'xclip -selection clipboard';
};

export const download = (name: string, text: string) => {
  const element = document.createElement('a');
  element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
  element.setAttribute('download', name);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

export const defaultGeneratorOptions: GeneratorOptions = {
  deletesAt: null,
  format: 'default',
  imageCompressionPercent: null,
  maxViews: null,
  addOriginalName: null,
  overrides_returnDomain: null,
  noJson: null,

  unix_useEcho: null,
  mac_enableCompatibility: null,
  wl_enableCompatibility: null,
  wl_compositorUnsupported: null,
};

const generators = {
  Flameshot: flameshot,
  ShareX: sharex,
  'Shell Script': shell,
};

export default function GeneratorButton({
  name,
  icon,
  desc,
}: {
  name: string;
  icon: React.ReactNode;
  desc?: React.ReactNode;
}) {
  const user = useUserStore((state) => state.user);
  const [opened, setOpen] = useState(false);

  const [generatorType, setGeneratorType] = useState('file');
  const [options, setOption] = useReducer(
    (state: GeneratorOptions, action: Partial<GeneratorOptions>) => ({ ...state, ...action }),
    defaultGeneratorOptions,
  );

  const isUnixLike = name === 'Flameshot' || name === 'Shell Script';
  const onlyFile = generatorType === 'file';

  return (
    <>
      <Modal opened={opened} onClose={() => setOpen(false)} title={<Title>Generate {name}</Title>}>
        {desc && (
          <Text size='sm' c='dimmed'>
            {desc}
          </Text>
        )}

        <Stack gap='xs' my='sm'>
          <Select
            data={[
              { label: 'Upload File', value: 'file' },
              { label: 'Shorten URL', value: 'url' },
            ]}
            description='Select which type of destination you want to generate'
            label='Destination Type'
            value={generatorType}
            onChange={(value) => setGeneratorType(value ?? 'file')}
            defaultValue='file'
            comboboxProps={{
              withinPortal: true,
              portalProps: {
                style: {
                  zIndex: 100000000,
                },
              },
            }}
          />

          <Divider />

          <Select
            data={[
              { value: 'default', label: 'Default' },
              { value: 'random', label: 'Random' },
              { value: 'date', label: 'Date' },
              { value: 'uuid', label: 'UUID' },
              { value: 'name', label: 'Use file name' },
              { value: 'gfycat', label: 'Gfycat-style name' },
            ]}
            label='Name format'
            description='The file name format to use when uploading files, the "File name" field will override this value.'
            leftSection={<IconWriting size='1rem' />}
            value={options.format}
            onChange={(value) => setOption({ format: (value || 'default') as GeneratorOptions['format'] })}
            defaultValue={null}
            comboboxProps={{
              withinPortal: true,
              portalProps: {
                style: {
                  zIndex: 100000000,
                },
              },
            }}
            disabled={!onlyFile}
          />

          <NumberInput
            label='Compression'
            description='The compression level to use on images (only). Leave blank to disable compression.'
            leftSection={<IconPercentage size='1rem' />}
            max={100}
            min={0}
            value={options.imageCompressionPercent || ''}
            onChange={(value) => setOption({ imageCompressionPercent: value === '' ? null : Number(value) })}
            disabled={!onlyFile}
          />

          <NumberInput
            label='Max Views'
            description='The maximum number of views files/urls can have before they are deleted. Leave blank to allow as many views as you want.'
            leftSection={<IconEyeFilled size='1rem' />}
            min={0}
            value={options.maxViews || ''}
            onChange={(value) => setOption({ maxViews: value === '' ? null : Number(value) })}
          />

          <TextInput
            label='Override Domain'
            description='Override the domain with this value. This will change the domain returned in your uploads. Leave blank to use the default domain.'
            leftSection={<IconGlobe size='1rem' />}
            value={options.overrides_returnDomain ?? ''}
            onChange={(event) =>
              setOption({ overrides_returnDomain: event.currentTarget.value.trim() || null })
            }
          />

          <Text c='dimmed' size='sm'>
            <b>Other Options</b>
          </Text>

          <Switch
            label='Add Original Name'
            description={
              'Add the original file name, so that the file can be downloaded with the original name. This will still use the "Name Format" option for it\'s file name.'
            }
            checked={options.addOriginalName ?? false}
            onChange={(event) => setOption({ addOriginalName: event.currentTarget.checked ?? false })}
            disabled={!onlyFile}
          />

          {isUnixLike && (
            <>
              <Switch
                label='Enable Wayland Compatibility'
                description={
                  <>
                    Use <Code>wl-copy</Code> instead of <Code>xclip</Code> for copying to clipboard.
                  </>
                }
                checked={options.wl_enableCompatibility ?? false}
                onChange={(event) =>
                  setOption({
                    wl_enableCompatibility: event.currentTarget.checked,
                    mac_enableCompatibility: false,
                    unix_useEcho: false,
                  })
                }
                disabled={!!options.mac_enableCompatibility}
              />

              <Switch
                label='Enable macOS Compatibility'
                description={
                  <>
                    Use <Code>pbcopy</Code> instead of <Code>xclip</Code> for copying to clipboard.
                  </>
                }
                checked={options.mac_enableCompatibility ?? false}
                onChange={(event) =>
                  setOption({
                    mac_enableCompatibility: event.currentTarget.checked,
                    wl_enableCompatibility: false,
                    wl_compositorUnsupported: false,
                    unix_useEcho: false,
                  })
                }
                disabled={!!options.wl_enableCompatibility}
              />

              <Switch
                label='Using a DE other than Gnome, KDE or Sway?'
                description={
                  <>
                    If using a compositor such as{' '}
                    <Anchor component={Link} href='https://github.com/hyprwm/hyprland'>
                      Hyprland
                    </Anchor>
                    , this option will set the <Code>XDG_CURRENT_DESKTOP=sway</Code> to workaround
                    Flameshot&apos;s errors on Wayland. This is not needed on Xorg.
                  </>
                }
                checked={options.wl_compositorUnsupported ?? false}
                onChange={(event) => setOption({ wl_compositorUnsupported: event.currentTarget.checked })}
                disabled={!!options.mac_enableCompatibility}
              />

              <Switch
                label={
                  <>
                    Use <Code>echo</Code> instead of copying to clipboard
                  </>
                }
                description='Just output the url to the terminal instead of copying it to the clipboard.'
                checked={options.unix_useEcho ?? false}
                onChange={(event) =>
                  setOption({
                    unix_useEcho: event.currentTarget.checked,
                    mac_enableCompatibility: false,
                    wl_enableCompatibility: false,
                  })
                }
              />
            </>
          )}

          <Button
            onClick={() =>
              generators[name as keyof typeof generators](user!.token!, generatorType as any, options)
            }
            fullWidth
            leftSection={<IconDownload size='1rem' />}
            size='sm'
          >
            Download
          </Button>
        </Stack>
      </Modal>

      <Button size='sm' leftSection={icon} onClick={() => setOpen(true)}>
        {name}
      </Button>
    </>
  );
}
