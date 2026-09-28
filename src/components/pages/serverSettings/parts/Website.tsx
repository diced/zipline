import type { Response } from '@/lib/api/response';
import { Button, JsonInput, LoadingOverlay, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Website() {
  const { data, isLoading } = useServerSettings();

  return (
    <>
      <LoadingOverlay visible={isLoading} />
      {data ? <Form data={data} isLoading={isLoading} /> : null}
    </>
  );
}

function Form({ data, isLoading }: { data: Response['/api/server/settings']; isLoading: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation(['serverSettings', 'common']);

  const form = useForm({
    initialValues: {
      websiteTitle: data.settings.websiteTitle,
      websiteTitleLogo: data.settings.websiteTitleLogo,
      websiteExternalLinks: JSON.stringify(data.settings.websiteExternalLinks, null, 2),
      websiteLoginBackground: data.settings.websiteLoginBackground,
      websiteLoginBackgroundBlur: data.settings.websiteLoginBackgroundBlur,
      websiteDefaultAvatar: data.settings.websiteDefaultAvatar,
      websiteTos: data.settings.websiteTos,

      websiteThemeDefault: data.settings.websiteThemeDefault,
      websiteThemeDark: data.settings.websiteThemeDark,
      websiteThemeLight: data.settings.websiteThemeLight,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
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
        form.setFieldError('websiteExternalLinks', t('website.errors.invalidJson'));
      }
    }

    sendValues.websiteTitleLogo =
      values.websiteTitleLogo?.trim() === '' || !values.websiteTitleLogo?.trim()
        ? null
        : values.websiteTitleLogo.trim();
    sendValues.websiteLoginBackground =
      values.websiteLoginBackground?.trim() === '' || !values.websiteLoginBackground?.trim()
        ? null
        : values.websiteLoginBackground.trim();
    sendValues.websiteDefaultAvatar =
      values.websiteDefaultAvatar?.trim() === '' || !values.websiteDefaultAvatar?.trim()
        ? null
        : values.websiteDefaultAvatar.trim();
    sendValues.websiteTos =
      values.websiteTos?.trim() === '' || !values.websiteTos?.trim() ? null : values.websiteTos.trim();

    sendValues.websiteThemeDefault = values.websiteThemeDefault.trim();
    sendValues.websiteThemeDark = values.websiteThemeDark.trim();
    sendValues.websiteThemeLight = values.websiteThemeLight.trim();
    sendValues.websiteTitle = values.websiteTitle.trim();

    sendValues.websiteLoginBackgroundBlur = values.websiteLoginBackgroundBlur;

    return settingsOnSubmit(navigate, form)(sendValues);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap='lg'>
        <TextInput
          label={t('website.title.label')}
          description={t('website.title.description')}
          placeholder='Zipline'
          {...form.getInputProps('websiteTitle')}
        />

        <TextInput
          label={t('website.titleLogo.label')}
          description={t('website.titleLogo.description')}
          placeholder='https://example.com/logo.png'
          {...form.getInputProps('websiteTitleLogo')}
        />

        <JsonInput
          label={t('website.externalLinks.label')}
          description={t('website.externalLinks.description')}
          formatOnBlur
          minRows={1}
          maxRows={7}
          autosize
          placeholder={JSON.stringify(
            [
              { name: 'GitHub', url: 'https://github.com/diced/zipline' },
              { name: 'Documentation', url: 'https://zipline.diced.sh' },
            ],
            null,
            2,
          )}
          {...form.getInputProps('websiteExternalLinks')}
        />

        <TextInput
          label={t('website.loginBackground.label')}
          description={t('website.loginBackground.description')}
          placeholder='https://example.com/background.png'
          {...form.getInputProps('websiteLoginBackground')}
        />

        <Switch
          label={t('website.loginBackgroundBlur.label')}
          description={t('website.loginBackgroundBlur.description')}
          {...form.getInputProps('websiteLoginBackgroundBlur', { type: 'checkbox' })}
        />

        <TextInput
          label={t('website.defaultAvatar.label')}
          description={t('website.defaultAvatar.description')}
          placeholder='/zipline/avatar.png'
          {...form.getInputProps('websiteDefaultAvatar')}
        />

        <TextInput
          label={t('website.tos.label')}
          description={t('website.tos.description')}
          placeholder='/zipline/TOS.md'
          {...form.getInputProps('websiteTos')}
        />

        <TextInput
          label={t('website.defaultTheme.label')}
          description={t('website.defaultTheme.description')}
          placeholder='system'
          {...form.getInputProps('websiteThemeDefault')}
        />

        <TextInput
          label={t('website.darkTheme.label')}
          description={t('website.darkTheme.description')}
          placeholder='builtin:dark_gray'
          {...form.getInputProps('websiteThemeDark')}
        />

        <TextInput
          label={t('website.lightTheme.label')}
          description={t('website.lightTheme.description')}
          placeholder='builtin:light_gray'
          {...form.getInputProps('websiteThemeLight')}
        />
      </Stack>
      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
