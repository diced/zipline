import { bytes } from '@/lib/bytes';
import type { File } from '@/lib/db/models/file';
import {
  IconBombFilled,
  IconDeviceSdCard,
  IconEyeFilled,
  IconFileInfo,
  IconRefresh,
  IconTextRecognition,
  IconUpload,
  IconUserQuestion,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import FileStat from './FileStat';

export default function FileStats({ file, reduce }: { file: File; reduce?: boolean }) {
  const { t } = useTranslation(['file', 'common']);

  return (
    <>
      <FileStat Icon={IconFileInfo} title={t('stats.type')} value={file.type} />
      <FileStat Icon={IconDeviceSdCard} title={t('stats.size')} value={bytes(file.size)} />
      <FileStat
        Icon={IconUpload}
        title={t('stats.createdAt')}
        value={new Date(file.createdAt).toLocaleString()}
      />
      <FileStat
        Icon={IconRefresh}
        title={t('stats.updatedAt')}
        value={new Date(file.updatedAt).toLocaleString()}
      />
      {file.deletesAt && !reduce && (
        <FileStat
          Icon={IconBombFilled}
          title={t('stats.deletesAt')}
          value={new Date(file.deletesAt).toLocaleString()}
        />
      )}
      <FileStat
        Icon={IconEyeFilled}
        title={t('stats.views')}
        value={file.maxViews ? `${file.views} / ${file.maxViews}` : file.views}
      />
      {file.originalName && (
        <FileStat Icon={IconTextRecognition} title={t('stats.originalName')} value={file.originalName} />
      )}
      {file.anonymous && (
        <FileStat Icon={IconUserQuestion} title={t('stats.anonymous')} value={t('common:actions.yes')} />
      )}
    </>
  );
}
