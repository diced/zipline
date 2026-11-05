import { Button, Modal, PasswordInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';

export default function PasswordModal({
  type,
  id,
  onUnlock,
}: {
  type: 'file' | 'url';
  id: string;
  onUnlock: (token: string) => void;
}) {
  const { t } = useTranslation('view');
  const form = useForm({
    initialValues: { password: '' },
    validate: {
      password: (value) => (value.trim().length === 0 ? t('password.invalid') : null),
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const res = await fetch(`/api/user/${type}s/${id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: values.password.trim() }),
    });

    if (res.ok) {
      const json = (await res.json()) as { token: string };
      onUnlock(json.token);
    } else {
      form.setFieldError('password', t('password.invalid'));
    }
  };

  return (
    <Modal onClose={() => {}} opened withCloseButton={false} centered title={t('password.title')}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        <PasswordInput
          description={t(type === 'file' ? 'password.fileDescription' : 'password.urlDescription')}
          required
          mb='sm'
          {...form.getInputProps('password')}
        />

        <Button
          fullWidth
          variant='outline'
          my='sm'
          type='submit'
          disabled={form.values.password.trim().length === 0}
        >
          {t('password.verify')}
        </Button>
      </form>
    </Modal>
  );
}
