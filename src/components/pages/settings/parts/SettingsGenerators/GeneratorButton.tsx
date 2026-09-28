import { Response } from '@/lib/api/response';
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
} from '@mantine/core';
import { IconDownload, IconEyeFilled, IconGlobe, IconPercentage, IconWriting } from '@tabler/icons-react';
import { useReducer, useState } from 'react';
import useSWR from 'swr';
import { flameshot } from './generators/flameshot';
import { sharex } from './generators/sharex';
import { shell } from './generators/shell';
import { ishare } from './generators/ishare';
import { itake } from './generators/itake';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export type GeneratorOptions = {
  deletesAt: string | null;
  format: Config['files']['defaultFormat'] | 'default';
  imageCompressionPercent: number | null;
  maxViews: number | null;
  addOriginalName: boolean | null;
  extensionless: boolean | null;
  overrides_returnDomain: string | null;
  noJson: boolean | null;

  // changes {json:...} to $json:...$ for the Xshare app on Android
  sharex_xshareCompatibility: boolean | null;

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
  extensionless: null,
  overrides_returnDomain: null,
  noJson: null,

  sharex_xshareCompatibility: null,

  unix_useEcho: null,
  mac_enableCompatibility: null,
  wl_enableCompatibility: null,
  wl_compositorUnsupported: null,
};

const generators = {
  Flameshot: flameshot,
  ShareX: sharex,
  'Shell Script': shell,
  ishare,
  iTake: itake,
};

export default function GeneratorButton({
  name,
  label,
  icon,
  desc,
}: {
  name: string;
  // display name, defaults to `name` which is also used as the generator identifier
  label?: string;
  icon: React.ReactNode;
  desc?: React.ReactNode;
}) {
  const { t } = useTranslation(['settings', 'common']);
  const displayName = label ?? name;
  const [opened, setOpen] = useState(false);

  const [generatorType, setGeneratorType] = useState('file');
  const [options, setOption] = useReducer(
    (state: GeneratorOptions, action: Partial<GeneratorOptions>) => ({ ...state, ...action }),
    defaultGeneratorOptions,
  );

  const { data: tokenData, isLoading, error } = useSWR<Response['/api/user/token']>('/api/user/token');
  const { data: settingsData } = useSWR<Response['/api/server/public']>('/api/server/public');

  const isUnixLike = name === 'Flameshot' || name === 'Shell Script';
  const onlyFile = generatorType === 'file';

  const domains = Array.isArray(settingsData?.domains) ? settingsData?.domains.map((d) => String(d)) : [];
  const domainOptions = [
    { value: '', label: t('generators.modal.overrideDomain.default') },
    ...domains.map((domain) => ({
      value: domain,
      label: domain,
    })),
  ] as { value: string; label: string; disabled?: boolean }[];

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpen(false)}
        title={t('generators.modal.title', { name: displayName })}
      >
        {desc && (
          <Text size='sm' c='dimmed'>
            {desc}
          </Text>
        )}

        <Stack gap='xs' my='sm'>
          <Select
            data={[
              { label: t('generators.modal.destinationType.options.file'), value: 'file' },
              {
                label: t('generators.modal.destinationType.options.url'),
                value: 'url',
                disabled: name === 'ishare' || name === 'iTake',
              },
            ]}
            description={t('generators.modal.destinationType.description')}
            label={t('generators.modal.destinationType.label')}
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
              { value: 'default', label: t('generators.modal.format.options.default') },
              { value: 'random', label: t('generators.modal.format.options.random') },
              { value: 'date', label: t('generators.modal.format.options.date') },
              { value: 'uuid', label: t('generators.modal.format.options.uuid') },
              { value: 'name', label: t('generators.modal.format.options.name') },
              { value: 'gfycat', label: t('generators.modal.format.options.gfycat') },
            ]}
            label={t('generators.modal.format.label')}
            description={t('generators.modal.format.description')}
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
            label={t('generators.modal.compression.label')}
            description={t('generators.modal.compression.description')}
            leftSection={<IconPercentage size='1rem' />}
            max={100}
            min={0}
            value={options.imageCompressionPercent || ''}
            onChange={(value) => setOption({ imageCompressionPercent: value === '' ? null : Number(value) })}
            disabled={!onlyFile}
          />

          <NumberInput
            label={t('generators.modal.maxViews.label')}
            description={t('generators.modal.maxViews.description')}
            leftSection={<IconEyeFilled size='1rem' />}
            min={0}
            value={options.maxViews || ''}
            onChange={(value) => setOption({ maxViews: value === '' ? null : Number(value) })}
          />

          <Select
            data={domainOptions}
            label={t('generators.modal.overrideDomain.label')}
            description={t('generators.modal.overrideDomain.description')}
            leftSection={<IconGlobe size='1rem' />}
            value={options.overrides_returnDomain ?? ''}
            onChange={(value) => setOption({ overrides_returnDomain: value || null })}
            comboboxProps={{
              withinPortal: true,
              portalProps: {
                style: {
                  zIndex: 100000000,
                },
              },
            }}
          />

          <Text c='dimmed' size='sm'>
            <b>{t('generators.modal.otherOptions')}</b>
          </Text>

          <Switch
            label={t('generators.modal.addOriginalName.label')}
            description={t('generators.modal.addOriginalName.description')}
            checked={options.addOriginalName ?? false}
            onChange={(event) => setOption({ addOriginalName: event.currentTarget.checked ?? false })}
            disabled={!onlyFile}
          />

          {settingsData?.files?.extensionlessUrls && (
            <Switch
              label={t('generators.modal.extensionless.label')}
              description={t('generators.modal.extensionless.description')}
              checked={options.extensionless ?? false}
              onChange={(event) => setOption({ extensionless: event.currentTarget.checked ?? false })}
              disabled={!onlyFile}
            />
          )}

          {name === 'ShareX' && (
            <Switch
              label={t('generators.modal.xshareCompatibility.label')}
              description={t('generators.modal.xshareCompatibility.description')}
              checked={options.sharex_xshareCompatibility ?? false}
              onChange={(event) => setOption({ sharex_xshareCompatibility: event.currentTarget.checked })}
              disabled={!onlyFile}
            />
          )}

          {isUnixLike && (
            <>
              <Switch
                label={t('generators.modal.waylandCompatibility.label')}
                description={
                  <Trans
                    t={t}
                    i18nKey='generators.modal.waylandCompatibility.description'
                    components={{ code: <Code /> }}
                  />
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
                label={t('generators.modal.macCompatibility.label')}
                description={
                  <Trans
                    t={t}
                    i18nKey='generators.modal.macCompatibility.description'
                    components={{ code: <Code /> }}
                  />
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
                label={t('generators.modal.compositorUnsupported.label')}
                description={
                  <Trans
                    t={t}
                    i18nKey='generators.modal.compositorUnsupported.description'
                    components={{
                      link: <Anchor size='xs' component={Link} to='https://github.com/hyprwm/hyprland' />,
                      code: <Code />,
                    }}
                  />
                }
                checked={options.wl_compositorUnsupported ?? false}
                onChange={(event) => setOption({ wl_compositorUnsupported: event.currentTarget.checked })}
                disabled={!!options.mac_enableCompatibility}
              />

              <Switch
                label={
                  <Trans t={t} i18nKey='generators.modal.useEcho.label' components={{ code: <Code /> }} />
                }
                description={t('generators.modal.useEcho.description')}
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

          {isUnixLike && (
            <Text c='dimmed' size='sm'>
              <Trans
                t={t}
                i18nKey='generators.modal.waylandHelp'
                components={{ link: <Anchor href='https://zipline.diced.sh/docs/guides/wayland' /> }}
              />
            </Text>
          )}

          <Button
            onClick={() =>
              generators[name as keyof typeof generators](tokenData!.token!, generatorType as any, options)
            }
            fullWidth
            leftSection={<IconDownload size='1rem' />}
            size='sm'
          >
            {t('common:actions.download')}
          </Button>
        </Stack>
      </Modal>

      <Button size='sm' leftSection={icon} onClick={() => setOpen(true)} disabled={isLoading || error}>
        {displayName}
      </Button>
    </>
  );
}
