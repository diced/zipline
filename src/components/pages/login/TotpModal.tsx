import { Modal, Center, PinInput, Text, Group, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconX, IconShieldQuestion } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export default function TotpModal({
  state,
  onPinChange,
  onVerify,
  onCancel,
}: {
  state: { open: boolean; disabled: boolean; error: string; pin: string };
  onPinChange: (val: string) => void;
  onVerify: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(['auth', 'common']);
  const mobile = useMediaQuery('(max-width: 600px)');

  return (
    <Modal onClose={onCancel} title={t('totp.title')} opened={state.open} withCloseButton={false}>
      <form onSubmit={onVerify}>
        <Center>
          <PinInput
            length={6}
            oneTimeCode
            type='number'
            onChange={onPinChange}
            error={!!state.error}
            disabled={state.disabled}
            size={mobile ? 'md' : 'xl'}
            autoFocus
          />
        </Center>
        {state.error && (
          <Text ta='center' size='sm' c='red' mt='xs'>
            {state.error}
          </Text>
        )}

        <Group mt='sm' grow>
          <Button leftSection={<IconX size='1rem' />} color='red' variant='outline' onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            leftSection={<IconShieldQuestion size='1rem' />}
            loading={state.disabled}
            onClick={onVerify}
            type='submit'
          >
            {t('totp.verify')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
