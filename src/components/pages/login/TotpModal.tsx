import { Modal, Center, PinInput, Text, Group, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconX, IconShieldQuestion } from '@tabler/icons-react';

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
  const mobile = useMediaQuery('(max-width: 600px)');

  return (
    <Modal onClose={onCancel} title='Enter code' opened={state.open} withCloseButton={false}>
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
            Cancel
          </Button>
          <Button
            leftSection={<IconShieldQuestion size='1rem' />}
            loading={state.disabled}
            onClick={onVerify}
            type='submit'
          >
            Verify
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
