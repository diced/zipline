import { Anchor, Code, Group, Paper, Text, Title, Image as MantineImage } from '@mantine/core';
import { IconPrompt } from '@tabler/icons-react';
import GeneratorButton from './GeneratorButton';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function SettingsGenerators() {
  const { t } = useTranslation('settings');

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>{t('generators.title')}</Title>
      <Text size='sm' c='dimmed' mt={3}>
        {t('generators.description')}
      </Text>

      <Group mt='xs'>
        <GeneratorButton
          name='ShareX'
          icon={
            <img
              width={24}
              height={24}
              alt={t('generators.logoAlt', { name: 'sharex' })}
              src='https://getsharex.com/img/ShareX_Logo.svg'
            />
          }
        />
        <GeneratorButton
          name='Flameshot'
          icon={
            <img
              width={24}
              height={24}
              alt={t('generators.logoAlt', { name: 'flameshot' })}
              src='https://flameshot.org/flameshot-icon.svg'
            />
          }
          desc={
            <Trans
              t={t}
              i18nKey='generators.desc.flameshot'
              components={{
                flameshotLink: <Anchor component={Link} to='https://flameshot.org' />,
                curlLink: <Anchor component={Link} to='https://curl.se/' />,
                jqLink: <Anchor component={Link} to='https://github.com/stedolan/jq' />,
                xclipLink: <Anchor component={Link} to='https://github.com/astrand/xclip' />,
                code: <Code />,
              }}
            />
          }
        />
        <GeneratorButton
          name='ishare'
          icon={
            <MantineImage
              width={24}
              height={24}
              alt={t('generators.logoAlt', { name: 'ishare' })}
              src='https://raw.githubusercontent.com/itoolio/ishare/refs/tags/v4.2.5/ishare/Util/Assets.xcassets/AppIcon.appiconset/AppIcon-128.png'
            />
          }
          desc={
            <Trans
              t={t}
              i18nKey='generators.desc.ishare'
              components={{ link: <Anchor href='https://github.com/itoolio/ishare' /> }}
            />
          }
        />
        <GeneratorButton
          name='iTake'
          icon={
            <MantineImage
              width={24}
              height={24}
              alt={t('generators.logoAlt', { name: 'iTake' })}
              src='https://raw.githubusercontent.com/SerStars/iTake/refs/heads/main/preview/AppIcon.png'
            />
          }
          desc={
            <Trans
              t={t}
              i18nKey='generators.desc.itake'
              components={{ link: <Anchor href='https://github.com/SerStars/iTake' /> }}
            />
          }
        />
        <GeneratorButton
          name='Shell Script'
          label={t('generators.shellScript')}
          icon={<IconPrompt size={24} />}
          desc={
            <Trans
              t={t}
              i18nKey='generators.desc.shell'
              components={{
                curlLink: <Anchor component={Link} to='https://curl.se/' />,
                fileLink: <Anchor component={Link} to='https://darwinsys.com/file/' />,
                jqLink: <Anchor component={Link} to='https://github.com/stedolan/jq' />,
                xclipLink: <Anchor component={Link} to='https://github.com/astrand/xclip' />,
                code: <Code />,
              }}
            />
          }
        />
      </Group>
    </Paper>
  );
}
