import { useConfig } from '@/components/ConfigProvider';
import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
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
      clipboard: { copy: (text: string) => void };
      clearEphemeral?: () => void;
      config: ReturnType<typeof useConfig>;
    },
): Promise<{ files: Response['/api/upload/partial']['files'] } | null> {
  setLoading(true);
  setProgress({ percent: 0, remaining: 0, speed: 0 });

  const chunkSize = bytes(config.chunks.size);
  const totalFiles = files.length;
  const uploadedFiles: Response['/api/upload/partial']['files'] = [];

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];

    const tracker = progressTracker(file.size);
    let lastUpdate = 0;

    const nChunks = Math.ceil(file.size / chunkSize);
    const chunks: {
      blob: Blob;
      start: number;
      end: number;
    }[] = [];

    for (let j = 0; j !== nChunks; ++j) {
      const start = j * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      chunks.push({
        blob: file.slice(start, end),
        start,
        end,
      });
    }

    const fileLabel =
      totalFiles > 1 ? `Uploading large file (${i + 1}/${totalFiles})` : 'Uploading large file';

    notifications.show({
      id: 'upload-partial',
      title: fileLabel,
      message: file.name,
      loading: true,
      autoClose: false,
    });

    let ready = true;
    let identifier: string | undefined;
    let failed = false;

    for (let j = 0; j !== nChunks; ++j) {
      while (!ready && !failed) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (failed) break;

      const body = new FormData();
      body.append('file', chunks[j].blob);

      setLoading(true);

      notifications.update({
        id: 'upload-partial',
        title: fileLabel,
        message: `Chunk ${j + 1}/${nChunks}`,
        loading: true,
        autoClose: false,
        color: 'blue',
      });

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

      req.addEventListener(
        'load',
        () => {
          const { data: res, error } = handleUploadResponse<Response['/api/upload/partial']>(req);

          if (error || !res) {
            notifications.update({
              id: 'upload-partial',
              title: 'Error uploading file',
              message: `${file.name}: ${error?.error ?? 'An unknown error occurred'}`,
              color: 'red',
              icon: <IconFileXFilled size='1rem' />,
              autoClose: false,
              loading: false,
            });
            failed = true;
            setProgress({ percent: 0, remaining: 0, speed: 0 });
            setLoading(false);
            return;
          }

          if (j === 0) {
            identifier = res.partialIdentifier;
          }

          if (j === chunks.length - 1) {
            uploadedFiles.push(...res.files);
            setFiles((prev) => prev.filter((f) => f !== file));

            const isLastFile = i === totalFiles - 1;

            notifications.update({
              id: 'upload-partial',
              title: isLastFile ? 'Large file uploads complete' : 'Large file offloaded',
              message: isLastFile
                ? `Offloaded ${uploadedFiles.length} large file${uploadedFiles.length === 1 ? '' : 's'} for background processing`
                : `${file.name} offloaded (${i + 1}/${totalFiles})`,
              color: 'green',
              icon: <IconFileUpload size='1rem' />,
              autoClose: isLastFile,
              loading: false,
            });

            if (isLastFile) {
              setProgress({ percent: 100, remaining: 0, speed: 0 });
              setLoading(false);
              setTimeout(() => setProgress({ percent: 0, remaining: 0, speed: 0 }), 1000);
            } else {
              setProgress({ percent: 0, remaining: 0, speed: 0 });
            }
          }

          tracker.finish(chunks[j].blob.size);

          ready = true;
        },
        false,
      );

      req.open('POST', '/api/upload/partial');
      applyUploadHeaders(req, { options, ephemeral, folder });

      identifier && req.setRequestHeader('x-zipline-p-identifier', identifier);
      req.setRequestHeader('x-zipline-p-filename', encodeURIComponent(file.name));
      req.setRequestHeader('x-zipline-p-lastchunk', j === chunks.length - 1 ? 'true' : 'false');
      req.setRequestHeader('x-zipline-p-content-type', file.type);
      req.setRequestHeader('x-zipline-p-content-length', file.size.toString());
      req.setRequestHeader('content-range', `bytes ${chunks[j].start}-${chunks[j].end}/${file.size}`);

      req.send(body);

      ready = false;
    }

    while (!ready && !failed) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (failed) return uploadedFiles.length ? { files: uploadedFiles } : null;
  }

  return uploadedFiles.length ? { files: uploadedFiles } : null;
}
