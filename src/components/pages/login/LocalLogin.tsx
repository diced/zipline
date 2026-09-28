import { Stack, TextInput, PasswordInput, Button } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useTranslation } from 'react-i18next';

export default function LocalLogin({
  form,
  onSubmit,
  loading,
  hasBackground,
}: {
  form: UseFormReturnType<any>;
  onSubmit: (values: any) => void;
  loading: boolean;
  hasBackground: boolean;
}) {
  const { t } = useTranslation('auth');

  return (
    <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
      <Stack my='sm'>
        <TextInput
          size='md'
          placeholder={t('form.username.placeholder')}
          autoComplete='username'
          styles={{
            input: { backgroundColor: hasBackground ? 'transparent' : undefined },
          }}
          {...form.getInputProps('username')}
        />

        <PasswordInput
          size='md'
          placeholder={t('form.password.placeholder')}
          autoComplete='current-password'
          styles={{
            input: { backgroundColor: hasBackground ? 'transparent' : undefined },
          }}
          {...form.getInputProps('password')}
        />

        <Button
          size='md'
          fullWidth
          type='submit'
          loading={loading}
          variant={hasBackground ? 'outline' : 'filled'}
        >
          {t('login.submit')}
        </Button>
      </Stack>
    </form>
  );
}
