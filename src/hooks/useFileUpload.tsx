import { useState, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { IconClipboard, IconFileUpload, IconFileXFilled } from '@tabler/icons-react';

interface UploadOptions {
  deletesAt?: string;
  format?: string;
  imageCompressionPercent?: number;
  maxViews?: number;
  addOriginalName?: boolean;
  overrides_returnDomain?: string;
}

interface EphemeralOptions {
  password?: string;
  filename?: string;
  folderId?: string;
}

interface UseFileUploadProps {
  options: UploadOptions;
  ephemeral: EphemeralOptions;
  onUploadComplete?: (files: any[]) => void;
  onProgressUpdate?: (progress: { [key: string]: number }) => void;
  onSpeedUpdate?: (speed: { [key: string]: number }) => void;
}

export function useFileUpload({
  options,
  ephemeral,
  onUploadComplete,
  onProgressUpdate,
  onSpeedUpdate,
}: UseFileUploadProps) {
  const isUploadingRef = useRef(false);

  const uploadFiles = async (files: File[]): Promise<any> => {
    // Reset progress and speed for current batch
    const resetProgress: { [key: string]: number } = {};
    const resetSpeed: { [key: string]: number } = {};
    files.forEach((file) => {
      resetProgress[file.name] = 0;
      resetSpeed[file.name] = 0;
    });
    onProgressUpdate?.(resetProgress);
    onSpeedUpdate?.(resetSpeed);

    const body = new FormData();
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    for (let i = 0; i !== files.length; ++i) {
      body.append('file', files[i]);
    }

    const headers: Record<string, string> = {};
    options.deletesAt !== 'never' && (headers['x-zipline-deletes-at'] = options.deletesAt!);
    options.format !== 'default' && (headers['x-zipline-format'] = options.format!);
    options.imageCompressionPercent &&
      (headers['x-zipline-image-compression-percent'] = options.imageCompressionPercent.toString());
    options.maxViews && (headers['x-zipline-max-views'] = options.maxViews.toString());
    options.addOriginalName && (headers['x-zipline-original-name'] = 'true');
    options.overrides_returnDomain && (headers['x-zipline-domain'] = options.overrides_returnDomain);
    ephemeral.password && (headers['x-zipline-password'] = ephemeral.password);
    ephemeral.filename && (headers['x-zipline-filename'] = encodeURIComponent(ephemeral.filename));
    if (ephemeral.folderId) {
      headers['x-zipline-folder'] = ephemeral.folderId;
    }

    // Use XMLHttpRequest for real upload progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();
      let speedValues: number[] = [];

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          const loadedDiff = e.loaded - lastLoaded;
          
          if (timeDiff >= 0.1 && loadedDiff > 0) {
            const instantSpeed = loadedDiff / timeDiff;
            speedValues.push(instantSpeed);
            
            if (speedValues.length > 5) {
              speedValues.shift();
            }
            
            const avgSpeed = speedValues.reduce((sum, s) => sum + s, 0) / speedValues.length;
            
            const updatedSpeed: { [key: string]: number } = {};
            files.forEach((file) => {
              updatedSpeed[file.name] = avgSpeed;
            });
            onSpeedUpdate?.(updatedSpeed);
            
            lastLoaded = e.loaded;
            lastTime = currentTime;
          }

          const overallPercent = (e.loaded / e.total) * 100;
          const updatedProgress: { [key: string]: number } = {};
          files.forEach((file) => {
            updatedProgress[file.name] = Math.min(100, overallPercent);
          });
          onProgressUpdate?.(updatedProgress);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);

          // Set files to 100%
          const completedProgress: { [key: string]: number } = {};
          const clearedSpeed: { [key: string]: number } = {};
          files.forEach((file) => {
            completedProgress[file.name] = 100;
            clearedSpeed[file.name] = 0;
          });
          onProgressUpdate?.(completedProgress);
          onSpeedUpdate?.(clearedSpeed);

          if (result.files && Array.isArray(result.files)) {
            const urls = result.files.map((f: any) => f.url);
            if (urls.length > 0) {
              try {
                await navigator.clipboard.writeText(urls.join('\n'));
                // Links copied notification removed for cleaner UX
              } catch (err) {
                const textArea = document.createElement('textarea');
                textArea.value = urls.join('\n');
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                // Links copied fallback notification removed for cleaner UX
              }
            }

            onUploadComplete?.(result.files);
          }

          // Upload success notification removed for cleaner UX

          resolve(result);
        } else {
          notifications.show({
            title: 'Upload failed',
            message: `Server returned status ${xhr.status}`,
            color: 'red',
            icon: <IconFileXFilled size='1rem' />,
            autoClose: 5000,
          });
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        notifications.show({
          title: 'Upload failed',
          message: 'Network error occurred during upload',
          color: 'red',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: 5000,
        });
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
        notifications.show({
          title: 'Upload cancelled',
          message: 'Upload was cancelled',
          color: 'orange',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: 5000,
        });
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', '/api/upload');
      
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(body);
    });
  };

  return {
    uploadFiles,
    isUploadingRef,
  };
}
