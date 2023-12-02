import { UploadHeaders } from '@/lib/uploader/parseHeaders';
import { GeneratorOptions, copier, download } from './GeneratorButton';

export function flameshot(token: string, type: 'file' | 'url', options: GeneratorOptions) {
  const curl = [
    'curl',
    '-H',
    `"authorization: ${token}"`,
    `${window.origin}/api/${type === 'file' ? 'upload' : 'user/urls'}`,
  ];

  if (type === 'file') {
    curl.push('-F', 'file=@/tmp/screenshot.png');
    curl.push('-H', 'content-type: multipart/form-data');
  } else {
    curl.push('-H', 'content-type: application/json');
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
    curl.push('-H', `${key}: ${value}`);
  }

  let script;

  if (type === 'file') {
    script = `#!/bin/bash${options.wl_compositorUnsupported ? '\nexport XDG_CURRENT_DESKTOP=sway' : ''}
flameshot gui -r > /tmp/screenshot.png
${curl.join(' ')}${options.noJson ? '' : ' | jq -r .files[0].url'} | tr -d '\\n' | ${copier(options)}
`;
  } else {
    script = `#!/bin/bash
${curl.join(' ')} -d "{\\"url\\": \\"$1\\"}"${
      options.noJson ? '' : ' | jq -r .files[0].url'
    } | tr -d '\\n' | ${copier(options)}
`;
  }

  return download(`zipline-flameshot-${type}.sh`, script);
}
