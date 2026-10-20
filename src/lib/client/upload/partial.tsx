import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import type { SafeConfig } from '@/lib/config/safe';
import i18n from '@/lib/i18n';
import { notifications } from '@mantine/notifications';
import { IconFileUpload, IconFileXFilled } from '@tabler/icons-react';
import { applyUploadHeaders, handleUploadResponse, UploadHandlers, UploadHeadersOptions } from './shared';
import { UploadProgress } from './useProgress';

export function progressTracker(size: number) {
  const alpha = 0.2;
  let totalBytes = 0;
  let resSpeed = 0;

  const startTime = Date.now();

  return {
    update: (loaded: number): UploadProgress => {
      const now = Date.now();
      const lastLoaded = totalBytes + loaded;

      const timeDiff = (now - startTime) / 1000;

      // exponential moving average
      if (timeDiff > 0) {
        const speed = lastLoaded / timeDiff;

        resSpeed = resSpeed === 0 ? speed : speed * alpha + resSpeed * (1 - alpha);
      }

      const percent = Math.round((lastLoaded / size) * 100);

      const remainingBytes = size - lastLoaded;
      const remaining = resSpeed > 0 ? remainingBytes / resSpeed : 0;

      return {
        percent: Math.min(percent, 99),
        speed: resSpeed,
        remaining: Math.max(remaining, 0),
      };
    },

    finish: (chunkSize: number) => {
      totalBytes += chunkSize;
    },
  };
}

export async function uploadPartialFiles(
  files: File[],
  {
    setProgress,
    setLoading,
    setFiles,
    options,
    ephemeral,
    config,
    folder,
  }: UploadHandlers &
    UploadHeadersOptions & {
      config: SafeConfig;
    },
): Promise<{ files: Response['/api/upload/partial']['files'] } | null> {
  setLoading?.(true);
  setProgress({ percent: 0, remaining: 0, speed: 0 });

  const chunkSize = bytes(config.chunks.size);
  const totalFiles = files.length;
  const uploadedFiles: Response['/api/upload/partial']['files'] = [];

  try {
    for (let i = 0; i !== files.length; ++i) {
      const file = files[i];
      const tracker = progressTracker(file.size);
      const nChunks = Math.ceil(file.size / chunkSize);
      let lastUpdate = 0;
      let token: string | undefined;

      const fileLabel =
        totalFiles > 1
          ? i18n.t('upload:notifications.partial.titleCount', { current: i + 1, total: totalFiles })
          : i18n.t('upload:notifications.partial.title');

      notifications.show({
        id: 'upload-partial',
        title: fileLabel,
        message: file.name,
        loading: true,
        autoClose: false,
      });

      try {
        for (let j = 0; j !== nChunks; ++j) {
          const start = j * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          const body = new FormData();
          body.append('file', chunk);

          notifications.update({
            id: 'upload-partial',
            title: fileLabel,
            message: i18n.t('upload:notifications.partial.chunk', { current: j + 1, total: nChunks }),
            loading: true,
            autoClose: false,
            color: 'blue',
          });

          const res = await new Promise<Response['/api/upload/partial']>((resolve, reject) => {
            const req = new XMLHttpRequest();

            req.upload.addEventListener('progress', (e) => {
              if (!e.lengthComputable) return;

              const stats = tracker.update(e.loaded);
              const now = Date.now();
              if (now - lastUpdate > 250) {
                setProgress(stats);
                lastUpdate = now;
              }
            });

            req.addEventListener('load', () => {
              const { data, error } = handleUploadResponse<Response['/api/upload/partial']>(req);
              if (error || !data) return reject(new Error(error?.error ?? i18n.t('upload:errors.unknown')));

              resolve(data);
            });
            req.addEventListener('error', () => reject(new Error(i18n.t('upload:errors.network'))));
            req.addEventListener('abort', () => reject(new Error(i18n.t('upload:errors.network'))));

            req.open('POST', '/api/upload/partial');
            applyUploadHeaders(req, { options, ephemeral, folder });

            token && req.setRequestHeader('x-zipline-p-token', token);
            req.setRequestHeader('x-zipline-p-filename', encodeURIComponent(file.name));
            req.setRequestHeader('x-zipline-p-lastchunk', j === nChunks - 1 ? 'true' : 'false');
            req.setRequestHeader('x-zipline-p-content-type', file.type);
            req.setRequestHeader('x-zipline-p-content-length', file.size.toString());
            req.setRequestHeader('content-range', `bytes ${start}-${end - 1}/${file.size}`);
            req.send(body);
          });

          token = res.partialToken;
          tracker.finish(chunk.size);

          if (j === nChunks - 1) {
            uploadedFiles.push(...res.files);
            setFiles((prev) => prev.filter((f) => f !== file));
          }
        }
      } catch (error) {
        notifications.update({
          id: 'upload-partial',
          title: i18n.t('upload:notifications.partial.error.title'),
          message: i18n.t('upload:notifications.partial.error.message', {
            name: file.name,
            error: error instanceof Error ? error.message : i18n.t('upload:errors.unknown'),
          }),
          color: 'red',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: false,
          loading: false,
        });
        setProgress({ percent: 0, remaining: 0, speed: 0 });
        return uploadedFiles.length ? { files: uploadedFiles } : null;
      }

      const isLastFile = i === totalFiles - 1;
      notifications.update({
        id: 'upload-partial',
        title: isLastFile
          ? i18n.t('upload:notifications.partial.complete.title')
          : i18n.t('upload:notifications.partial.offloaded.title'),
        message: isLastFile
          ? i18n.t('upload:notifications.partial.complete.message', { count: uploadedFiles.length })
          : i18n.t('upload:notifications.partial.offloaded.message', {
              name: file.name,
              current: i + 1,
              total: totalFiles,
            }),
        color: 'green',
        icon: <IconFileUpload size='1rem' />,
        autoClose: isLastFile,
        loading: false,
      });
      setProgress({ percent: isLastFile ? 100 : 0, remaining: 0, speed: 0 });
    }

    return uploadedFiles.length ? { files: uploadedFiles } : null;
  } finally {
    setLoading?.(false);
  }
}
