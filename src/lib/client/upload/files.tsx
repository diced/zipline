import SafeTrans from '@/components/SafeTrans';
import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import type { SafeConfig } from '@/lib/config/safe';
import i18n from '@/lib/i18n';
import { notifications } from '@mantine/notifications';
import { IconDeviceSdCard, IconFileUpload, IconFileXFilled } from '@tabler/icons-react';
import { uploadPartialFiles } from './partial';
import { UploadProgress } from './useProgress';
import {
  applyUploadHeaders,
  handleUploadResponse,
  showUploadModal,
  UploadHeadersOptions,
  UploadContextHandlers,
} from './shared';

// even if the server supports x parts per request, browser might lag hella so limit to 500 per req
// "poor mans chunking" if all the files are less than the chunk limit lol
const FILES_PER_REQUEST = 500;

export async function uploadFileBatch(
  files: File[],
  { config, ...context }: UploadContextHandlers & UploadHeadersOptions & { config: SafeConfig },
) {
  const maxBytes = config.chunks.enabled && bytes(config.chunks.max);
  const partialUploads = maxBytes ? files.filter((file) => file.size >= maxBytes) : [];
  const normalUploads = maxBytes ? files.filter((file) => file.size < maxBytes) : files;

  let uploadedNormal: Awaited<ReturnType<typeof uploadFiles>> = null;
  let uploadedPartial: Awaited<ReturnType<typeof uploadPartialFiles>> = null;

  if (normalUploads.length > 0) {
    const size = normalUploads.reduce((acc, file) => acc + file.size, 0);
    if (size > bytes(config.files.maxFileSize)) {
      notifications.show({
        title: i18n.t('upload:file.notifications.mayFail.title'),
        color: 'yellow',
        icon: <IconDeviceSdCard size='1rem' />,
        message: (
          <SafeTrans
            ns='upload'
            i18nKey='file.notifications.mayFail.message'
            values={{ size: bytes(size), limit: bytes(bytes(config.files.maxFileSize)) }}
            components={{ b: <b /> }}
          />
        ),
      });
    }

    uploadedNormal = await uploadFiles(normalUploads, {
      ...context,
      partials: partialUploads.length,
      showResult: false,
    });
  }

  if (
    partialUploads.length > 0 &&
    (normalUploads.length === 0 || uploadedNormal?.files.length === normalUploads.length)
  ) {
    uploadedPartial = await uploadPartialFiles(partialUploads, { ...context, config });
  }

  const allFiles = [...(uploadedNormal?.files ?? []), ...(uploadedPartial?.files ?? [])];
  if (allFiles.length > 0) {
    showUploadModal(allFiles, {
      clipboard: context.clipboard,
      clearEphemeral: () => {
        if (allFiles.length === files.length) context.clearEphemeral();
      },
      showCopyAll: true,
    });
  }
}

function progressTracker() {
  const alpha = 0.2;

  let lastLoaded = 0;
  let lastTime = Date.now();
  let resSpeed = 0;

  return (loaded: number, total: number): UploadProgress => {
    const now = Date.now();
    const timeDiff = (now - lastTime) / 1000;

    if (timeDiff > 0) {
      const loadedDiff = loaded - lastLoaded;
      const speed = loadedDiff / timeDiff;

      // exponential moving average
      resSpeed = resSpeed === 0 ? speed : speed * alpha + resSpeed * (1 - alpha);
      lastLoaded = loaded;
      lastTime = now;
    }

    const percent = total === 0 ? 100 : Math.round((loaded / total) * 100);

    const remainingBytes = total - loaded;
    const remaining = resSpeed > 0 ? remainingBytes / resSpeed : 0;

    return {
      percent,
      speed: resSpeed,
      remaining,
    };
  };
}

export async function uploadFiles(
  files: File[],
  {
    setProgress,
    setLoading,
    setFiles,
    clipboard,
    clearEphemeral,
    options,
    ephemeral,
    folder,
    partials,
    showResult = true,
  }: UploadContextHandlers & UploadHeadersOptions & { showResult?: boolean },
): Promise<{ files: Response['/api/upload']['files'] } | null> {
  setLoading?.(true);
  setProgress({ percent: 0, remaining: 0, speed: 0 });

  const partialCount = partials || 0;

  const batches = Math.ceil(files.length / FILES_PER_REQUEST);
  const aggBytes = files.reduce((acc, file) => acc + file.size, 0);

  notifications.show({
    id: 'upload',
    title: i18n.t('upload:notifications.preparing.title', { count: files.length }),
    message:
      batches > 1
        ? i18n.t('upload:notifications.preparing.messageBatches', { count: files.length, batches })
        : i18n.t('upload:notifications.preparing.message', { count: files.length }),
    loading: true,
    autoClose: false,
  });

  const tracker = progressTracker();
  let lastUpdate = 0;

  const uploadBatch = async (batchFiles: File[], completedBytes: number) =>
    new Promise<Response['/api/upload']>((resolve, reject) => {
      const body = new FormData();
      const batchBytes = batchFiles.reduce((acc, file) => acc + file.size, 0);

      for (let i = 0; i !== batchFiles.length; ++i) body.append('file', batchFiles[i]);

      const req = new XMLHttpRequest();

      req.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return;

        const loaded = completedBytes + Math.min(batchBytes, e.loaded);
        const stats = tracker(loaded, aggBytes);

        const now = Date.now();
        if (now - lastUpdate > 250 || e.loaded === e.total) {
          setProgress(stats);
          lastUpdate = now;
        }
      });

      req.addEventListener(
        'load',
        () => {
          const { data: res, error } = handleUploadResponse<Response['/api/upload']>(req);

          if (error || !res) return reject(new Error(error?.error ?? i18n.t('upload:errors.unknown')));

          resolve(res);
        },
        false,
      );

      req.addEventListener('error', () => {
        reject(new Error(i18n.t('upload:errors.network')));
      });
      req.addEventListener('abort', () => {
        reject(new Error(i18n.t('upload:errors.network')));
      });

      req.open('POST', '/api/upload');
      applyUploadHeaders(req, { options, ephemeral, folder });
      req.send(body);
    });

  const uploadedFiles: Response['/api/upload']['files'] = [];
  let complete = false;

  try {
    let completedBytes = 0;

    for (let start = 0, batchIndex = 0; start < files.length; start += FILES_PER_REQUEST, batchIndex++) {
      const batchFiles = files.slice(start, start + FILES_PER_REQUEST);
      const batchBytes = batchFiles.reduce((acc, file) => acc + file.size, 0);

      notifications.update({
        title:
          batches > 1
            ? i18n.t('upload:notifications.uploading.batch', { current: batchIndex + 1, total: batches })
            : i18n.t('upload:notifications.uploading.title', { count: batchFiles.length }),
        message: i18n.t('upload:notifications.uploading.message', { count: batchFiles.length }),
        loading: true,
        autoClose: false,
        id: 'upload',
      });

      const res = await uploadBatch(batchFiles, completedBytes);
      uploadedFiles.push(...res.files);
      setFiles((prev) => prev.filter((file) => !batchFiles.includes(file)));

      completedBytes += batchBytes;
      setProgress(tracker(completedBytes, aggBytes));
    }

    complete = true;

    notifications.update({
      id: 'upload',
      title:
        partialCount > 0
          ? i18n.t('upload:notifications.complete.titlePartial')
          : i18n.t('upload:notifications.complete.title'),
      message:
        partialCount > 0
          ? i18n.t('upload:notifications.complete.messagePartial', {
              uploaded: i18n.t('upload:notifications.complete.message', { count: files.length }),
              starting: i18n.t('upload:notifications.complete.startingPartials', { count: partialCount }),
            })
          : i18n.t('upload:notifications.complete.message', { count: files.length }),
      color: 'green',
      icon: <IconFileUpload size='1rem' />,
      autoClose: true,
      loading: false,
    });
  } catch (error) {
    notifications.update({
      id: 'upload',
      title: i18n.t('upload:notifications.error.title'),
      message: error instanceof Error ? error.message : i18n.t('upload:errors.unknown'),
      color: 'red',
      icon: <IconFileXFilled size='1rem' />,
      autoClose: true,
      loading: false,
    });

    setLoading?.(false);
    setProgress({ percent: 0, remaining: 0, speed: 0 });
  } finally {
    if (!partials) {
      setLoading?.(false);
      setProgress({ percent: 0, remaining: 0, speed: 0 });
    }
  }

  if (showResult && uploadedFiles.length > 0) {
    showUploadModal(uploadedFiles, {
      clipboard,
      clearEphemeral: () => {
        if (complete) clearEphemeral();
      },
      showCopyAll: true,
    });
  }

  return uploadedFiles.length > 0 ? { files: uploadedFiles } : null;
}
