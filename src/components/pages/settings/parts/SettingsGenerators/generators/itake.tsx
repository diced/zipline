import { UploadHeaders } from '@/lib/uploader/parseHeaders';
import { GeneratorOptions, download } from '../GeneratorButton';

export function itake(token: string, type: 'file' | 'url', options: GeneratorOptions) {
  if (type === 'url') {
    // unsupported in itake
    return;
  }

  const config = {
    name: `Zipline - ${window.location.origin} - File`,
    request: {
      url: `${window.location.origin}/api/upload`,
      method: 'POST',
      headers: {},
    },
    body: {
      type: 'multipart',
      fileField: 'file',
      fields: {},
    },
    response: {
      linkPath: 'files.0.url',
    },
  };

  const toAddHeaders: UploadHeaders = {
    authorization: token,
  };

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

  if (options.addOriginalName === true && type === 'file') {
    toAddHeaders['x-zipline-original-name'] = 'true';
  } else {
    delete toAddHeaders['x-zipline-original-name'];
  }

  if (options.extensionless === true && type === 'file') {
    toAddHeaders['x-zipline-extensionless'] = 'true';
  } else {
    delete toAddHeaders['x-zipline-extensionless'];
  }

  if (options.overrides_returnDomain !== null) {
    toAddHeaders['x-zipline-domain'] = options.overrides_returnDomain;
  } else {
    delete toAddHeaders['x-zipline-domain'];
  }

  for (const [key, value] of Object.entries(toAddHeaders)) {
    (config.request.headers as any)[key] = value;
  }

  return download(`zipline-${type}.itup`, JSON.stringify(config, null, 2));
}
