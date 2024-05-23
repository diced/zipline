import { UploadHeaders } from '@/lib/uploader/parseHeaders';
import { GeneratorOptions, download } from '../GeneratorButton';

export function sharex(token: string, type: 'file' | 'url', options: GeneratorOptions) {
  const config = {
    Version: '14.1.0',
    Name: `Zipline - ${window.location.origin} - ${type === 'file' ? 'File' : 'URL'}`,
    DestinationType: 'ImageUploader, TextUploader, FileUploader',
    RequestMethod: 'POST',
    RequestURL: `${window.location.origin}/api/upload`,
    Headers: {
      authentication: token,
    },
    URL: '{json:files[0]}',
    Body: 'MultipartFormData',
    FileFormName: 'file',
    Data: undefined,
  };

  if (type === 'url') {
    config.URL = '{json:url}';
    config.Body = 'JSON';
    config.DestinationType = 'URLShortener,URLSharingService';
    config.RequestURL = `${window.location.origin}/api/user/urls`;

    delete (config as any).FileFormName;
    (config as any).Data = JSON.stringify({ url: '{input}' });
  }

  const toAddHeaders: UploadHeaders = {};

  if (options.deletesAt !== null && type === 'file') {
    toAddHeaders['x-zipline-deletes-at'] = options.deletesAt;
  } else {
    delete toAddHeaders['x-zipline-deletes-at'];
  }

  if (options.format !== 'default' && type === 'file') {
    toAddHeaders['x-zipline-format'] = options.format;
  } else {
    delete toAddHeaders['x-zipline-format'];
  }

  if (options.imageCompressionPercent !== null && type === 'file') {
    toAddHeaders['x-zipline-image-compression-percent'] = options.imageCompressionPercent.toString();
  } else {
    delete toAddHeaders['x-zipline-image-compression-percent'];
  }

  if (options.maxViews !== null) {
    toAddHeaders['x-zipline-max-views'] = options.maxViews.toString();
  } else {
    delete toAddHeaders['x-zipline-max-views'];
  }

  if (options.noJson === true) {
    toAddHeaders['x-zipline-no-json'] = 'true';
    config.URL = '{response}';
  } else {
    delete toAddHeaders['x-zipline-no-json'];
  }

  if (options.addOriginalName === true && type === 'file') {
    toAddHeaders['x-zipline-original-name'] = 'true';
  } else {
    delete toAddHeaders['x-zipline-original-name'];
  }

  if (options.overrides_returnDomain !== null) {
    toAddHeaders['x-zipline-domain'] = options.overrides_returnDomain;
  } else {
    delete toAddHeaders['x-zipline-domain'];
  }

  for (const [key, value] of Object.entries(toAddHeaders)) {
    (config as any).Headers[key] = value;
  }

  return download(`zipline-${type}.sxcu`, JSON.stringify(config, null, 2));
}
