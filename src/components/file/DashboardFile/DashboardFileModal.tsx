import { useSettingsStore } from '@/lib/client/store/settings';
import type { File } from '@/lib/db/models/file';

import FileModal from './FileModal';
import FileViewer from './FileViewer';

export default function DashboardFileModal(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
  file?: File | null;
  reduce?: boolean;
  user?: string;
  sequenced?: boolean;
  onDelete?: () => void;
}) {
  const fileModal = useSettingsStore((state) => state.settings.fileViewer);

  if (fileModal === 'default') {
    return <FileModal {...props} />;
  }

  return <FileViewer {...props} />;
}
