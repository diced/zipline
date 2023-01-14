import { useState } from 'react';
import { GeneratorModal } from './GeneratorModal';

export default function ShareX({ user, open, setOpen }) {
  const [config, setConfig] = useState({
    Version: '14.1.0',
    Name: 'Zipline',
    DestinationType: 'ImageUploader, TextUploader',
    RequestMethod: 'POST',
    RequestURL: `${
      window.location.protocol +
      '//' +
      window.location.hostname +
      (window.location.port ? ':' + window.location.port : '')
    }/api/upload`,
    Headers: {
      Authorization: user?.token,
    },
    URL: '$json:files[0]$',
    Body: 'MultipartFormData',
    FileFormName: 'file',
    Data: undefined,
  });

  const onSubmit = (values) => {
    if (values.type === 'shorten-url') {
      config.RequestURL = `${
        window.location.protocol +
        '//' +
        window.location.hostname +
        (window.location.port ? ':' + window.location.port : '')
      }/api/shorten`;
      config.URL = '$json:url$';
      config.Body = 'JSON';
      delete config.FileFormName;
      config.Data = JSON.stringify({ url: '{input}' });
      setConfig(config);
    } else {
      delete config.Data;
      setConfig(config);
    }

    if (values.format !== 'RANDOM' && values.type === 'upload-file') {
      config.Headers['Format'] = values.format;
      setConfig(config);
    } else {
      delete config.Headers['Format'];
      setConfig(config);
    }

    if (values.imageCompression !== 0 && values.type === 'upload-file') {
      config.Headers['Image-Compression-Percent'] = values.imageCompression;
      setConfig(config);
    } else {
      delete config.Headers['Image-Compression-Percent'];
      setConfig(config);
    }

    if (values.zeroWidthSpace) {
      config.Headers['Zws'] = 'true';
      setConfig(config);
    } else {
      delete config.Headers['Zws'];
      setConfig(config);
    }

    if (values.embed && values.type === 'upload-file') {
      config.Headers['Embed'] = 'true';
      setConfig(config);
    } else {
      delete config.Headers['Embed'];
      setConfig(config);
    }

    if (values.noJSON) {
      config.URL = '{response}';
      config.Headers['No-JSON'] = 'true';
      setConfig(config);
    } else {
      delete config.Headers['No-JSON'];
      config.URL = values.type === 'upload-file' ? '$json:files[0]$' : '$json:url$';
      setConfig(config);
    }

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute(
      'href',
      'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, '\t'))
    );
    pseudoElement.setAttribute('download', `zipline${values.type === 'upload-file' ? '' : '-url'}.sxcu`);
    pseudoElement.style.display = 'none';
    document.body.appendChild(pseudoElement);
    pseudoElement.click();
    pseudoElement.parentNode.removeChild(pseudoElement);
  };

  return <GeneratorModal opened={open} onClose={() => setOpen(false)} title='ShareX' onSubmit={onSubmit} />;
}
