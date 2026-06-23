import { modals } from '@mantine/modals';

type WarningModalOptions = {
  message: string | React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
};

export function openWarningModal(options: WarningModalOptions) {
  modals.openConfirmModal({
    title: 'Are you sure?',
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
    size: 'md',
  });
}

export function conditionalWarning(on: boolean, options: WarningModalOptions) {
  if (on) {
    openWarningModal(options);
  } else {
    options.onConfirm();
  }
}
