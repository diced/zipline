import { Response } from '@/lib/api/response';
import { Button, Grid, JsonInput, Paper, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';
import { EnvTooltip } from '..';

const defaultExternalLinks = [
  {
    name: 'GitHub',
    url: 'https://github.com/diced/zipline',
  },
  {
    name: 'Documentation',
    url: 'https://zipline.diced.tech',
  },
];

export default function ServerSettingsWebsite({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      websiteTitle: 'Zipline',
      websiteTitleLogo: '',
      websiteExternalLinks: JSON.stringify(defaultExternalLinks),
      websiteLoginBackground: '',
      websiteLoginBackgroundBlur: true,
      websiteDefaultAvatar: '',
      websiteTos: '',

      websiteThemeDefault: 'system',
      websiteThemeDark: 'builtin:dark_gray',
      websiteThemeLight: 'builtin:light_gray',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const sendValues: Record<string, any> = {};

    if (values.websiteExternalLinks?.trim() === '' || !values.websiteExternalLinks) {
      // @ts-ignore
      sendValues.websiteExternalLinks = [];
    } else {
      // @ts-ignore
      try {
        sendValues.websiteExternalLinks = JSON.parse(values.websiteExternalLinks);
      } catch {
        form.setFieldError('websiteExternalLinks', 'Invalid JSON');
      }
    }

    sendValues.websiteTitleLogo =
      values.websiteTitleLogo.trim() === '' ? null : values.websiteTitleLogo.trim();
    sendValues.websiteLoginBackground =
      values.websiteLoginBackground.trim() === '' ? null : values.websiteLoginBackground.trim();
    sendValues.websiteDefaultAvatar =
      values.websiteDefaultAvatar.trim() === '' ? null : values.websiteDefaultAvatar.trim();
    sendValues.websiteTos = values.websiteTos.trim() === '' ? null : values.websiteTos.trim();

    sendValues.websiteThemeDefault = values.websiteThemeDefault.trim();
    sendValues.websiteThemeDark = values.websiteThemeDark.trim();
    sendValues.websiteThemeLight = values.websiteThemeLight.trim();
    sendValues.websiteTitle = values.websiteTitle.trim();

    sendValues.websiteLoginBackgroundBlur = values.websiteLoginBackgroundBlur;

    return settingsOnSubmit(router, form)(sendValues);
  };

  useEffect(() => {
    if (!data) return;

    form.setValues({
      websiteTitle: data?.websiteTitle ?? 'Zipline',
      websiteTitleLogo: data?.websiteTitleLogo ?? '',
      websiteExternalLinks: JSON.stringify(data?.websiteExternalLinks ?? defaultExternalLinks, null, 2),
      websiteLoginBackground: data?.websiteLoginBackground ?? '',
      websiteLoginBackgroundBlur: data?.websiteLoginBackgroundBlur ?? true,
      websiteDefaultAvatar: data?.websiteDefaultAvatar ?? '',
      websiteTos: data?.websiteTos ?? '',
      websiteThemeDefault: data?.websiteThemeDefault ?? 'system',
      websiteThemeDark: data?.websiteThemeDark ?? 'builtin:dark_gray',
      websiteThemeLight: data?.websiteThemeLight ?? 'builtin:light_gray',
    });
  }, [data]);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Website</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        {/* <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'> */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip envVar='WEBSITE_TITLE' data={data} varKey='websiteTitle'>
              <TextInput
                label='Title'
                description='The title of the website in browser tabs and at the top.'
                placeholder='Zipline'
                {...form.getInputProps('websiteTitle')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip envVar='WEBSITE_TITLE_LOGO' data={data} varKey='websiteTitleLogo'>
              <TextInput
                label='Title Logo'
                description='The URL to use for the title logo. This is placed to the left of the title.'
                placeholder='https://example.com/logo.png'
                {...form.getInputProps('websiteTitleLogo')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={12}>
            <EnvTooltip envVar='WEBSITE_EXTERNAL_LINKS' data={data} varKey='websiteExternalLinks'>
              <JsonInput
                label='External Links'
                description='The external links to show in the footer. This must be valid JSON.'
                formatOnBlur
                minRows={1}
                maxRows={7}
                autosize
                placeholder={JSON.stringify(defaultExternalLinks, null, 2)}
                {...form.getInputProps('websiteExternalLinks')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip envVar='WEBSITE_LOGIN_BACKGROUND' data={data} varKey='websiteLoginBackground'>
              <TextInput
                label='Login Background'
                description='The URL to use for the login background.'
                placeholder='https://example.com/background.png'
                {...form.getInputProps('websiteLoginBackground')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip
              envVar='WEBSITE_LOGIN_BACKGROUND_BLUR'
              data={data}
              varKey='websiteLoginBackgroundBlur'
            >
              <Switch
                label='Login Background Blur'
                description='Whether to blur the login background.'
                {...form.getInputProps('websiteLoginBackgroundBlur', { type: 'checkbox' })}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip envVar='WEBSITE_DEFAULT_AVATAR' data={data} varKey='websiteDefaultAvatar'>
              <TextInput
                label='Default Avatar'
                description='The path to use for the default avatar. This must be a path to an image, not a URL.'
                placeholder='/zipline/avatar.png'
                {...form.getInputProps('websiteDefaultAvatar')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip envVar='WEBSITE_TOS' data={data} varKey='websiteTos'>
              <TextInput
                label='Terms of Service'
                description='Path to a Markdown (.md) file to use for the terms of service.'
                placeholder='/zipline/TOS.md'
                {...form.getInputProps('websiteTos')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={12}>
            <EnvTooltip envVar='WEBSITE_THEME_DEFAULT' data={data} varKey='websiteThemeDefault'>
              <TextInput
                label='Default Theme'
                description='The default theme to use for the website.'
                placeholder='system'
                {...form.getInputProps('websiteThemeDefault')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip envVar='WEBSITE_THEME_DARK' data={data} varKey='websiteThemeDark'>
              <TextInput
                label='Dark Theme'
                description='The dark theme to use for the website when the default theme is "system".'
                placeholder='builtin:dark_gray'
                disabled={form.values.websiteThemeDefault !== 'system'}
                {...form.getInputProps('websiteThemeDark')}
              />
            </EnvTooltip>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <EnvTooltip envVar='WEBSITE_THEME_LIGHT' data={data} varKey='websiteThemeLight'>
              <TextInput
                label='Light Theme'
                description='The light theme to use for the website when the default theme is "system".'
                placeholder='builtin:light_gray'
                disabled={form.values.websiteThemeDefault !== 'system'}
                {...form.getInputProps('websiteThemeLight')}
              />
            </EnvTooltip>
          </Grid.Col>
        </Grid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
