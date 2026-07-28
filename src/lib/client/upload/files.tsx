import { Response } from '@/lib/api/response';
import { notifications } from '@mantine/notifications';
import { IconFileUpload, IconFileXFilled } from '@tabler/icons-react';
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

    const percent = Math.round((loaded / total) * 100);

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
  }: UploadContextHandlers & UploadHeadersOptions,
): Promise<{ files: Response['/api/upload']['files'] } | null> {
  setLoading(true);
  setProgress({ percent: 0, remaining: 0, speed: 0 });

  const partialCount = partials || 0;

  const batches = Math.ceil(files.length / FILES_PER_REQUEST);
  const aggBytes = files.reduce((acc, file) => acc + file.size, 0);

  notifications.show({
    id: 'upload',
    title: `Preparing file${files.length > 1 ? 's' : ''}`,
    message:
      batches > 1
        ? `Uploading ${files.length} file${files.length > 1 ? 's' : ''} in ${batches} batche${batches > 1 ? 's' : ''}`
        : `Uploading ${files.length} file${files.length > 1 ? 's' : ''}`,
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

          if (error || !res) return reject(new Error(error?.error ?? 'An unknown error occurred'));

          resolve(res);
        },
        false,
      );

      req.addEventListener('error', () => {
        reject(new Error('Network error while uploading files'));
      });

      req.open('POST', '/api/upload');
      applyUploadHeaders(req, { options, ephemeral, folder });
      req.send(body);
    });

  try {
    let completedBytes = 0;
    const uploadedFiles: Response['/api/upload']['files'] = [];

    for (let start = 0, batchIndex = 0; start < files.length; start += FILES_PER_REQUEST, batchIndex++) {
      const batchFiles = files.slice(start, start + FILES_PER_REQUEST);
      const batchBytes = batchFiles.reduce((acc, file) => acc + file.size, 0);

      notifications.update({
        title:
          batches > 1
            ? `Uploading batch ${batchIndex + 1}/${batches}`
            : `Uploading file${batchFiles.length > 1 ? 's' : ''}`,
        message: `${batchFiles.length} file${batchFiles.length > 1 ? 's' : ''}`,
        loading: true,
        autoClose: false,
        id: 'upload',
      });

      const res = await uploadBatch(batchFiles, completedBytes);
      uploadedFiles.push(...res.files);

      completedBytes += batchBytes;
      setProgress(tracker(completedBytes, aggBytes));
    }

    notifications.update({
      id: 'upload',
      title: partialCount > 0 ? 'Regular uploads complete' : 'Upload complete',
      message:
        partialCount > 0
          ? `Uploaded ${files.length} file${files.length === 1 ? '' : 's'}. Starting ${partialCount} large file upload${partialCount === 1 ? '' : 's'}...`
          : `Uploaded ${files.length} file${files.length === 1 ? '' : 's'}`,
      color: 'green',
      icon: <IconFileUpload size='1rem' />,
      autoClose: true,
      loading: false,
    });

    setFiles((prev) => prev.filter((file) => !files.includes(file)));

    if (partialCount === 0) {
      showUploadModal(uploadedFiles, {
        clipboard,
        clearEphemeral,
        showCopyAll: true,
      });
    }

    return { files: uploadedFiles };
  } catch (error) {
    notifications.update({
      id: 'upload',
      title: 'Error uploading files',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      color: 'red',
      icon: <IconFileXFilled size='1rem' />,
      autoClose: true,
      loading: false,
    });

    setLoading(false);
    setProgress({ percent: 0, remaining: 0, speed: 0 });

    return null;
  } finally {
    if (!partials) {
      setLoading(false);
      setProgress({ percent: 0, remaining: 0, speed: 0 });
    }
  }
}
