import i18n from '@/lib/i18n';
import { modals } from '@mantine/modals';

type WarningModalOptions = {
  message: string | React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
};

export function openWarningModal(options: WarningModalOptions) {
  modals.openConfirmModal({
    title: i18n.t('warning.title'),
    labels: {
      cancel: i18n.t('actions.cancel'),
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
