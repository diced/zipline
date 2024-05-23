import { Title } from '@mantine/core';
import { modals } from '@mantine/modals';

type WarningModalOptions = {
  message: string | React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
};

export function openWarningModal(options: WarningModalOptions) {
  modals.openConfirmModal({
    title: <Title order={3}>Are you sure?</Title>,
    labels: {
      cancel: 'Cancel',
      confirm: options.confirmLabel,
    },
    children: options.message,
    confirmProps: {
      color: 'red',
    },
    onCancel: () => modals.closeAll(),
    onConfirm: options.onConfirm,
    zIndex: 10320948239487,
  });
}

export function conditionalWarning(on: boolean, options: WarningModalOptions) {
  if (on) {
    openWarningModal(options);
  } else {
    options.onConfirm();
  }
}
