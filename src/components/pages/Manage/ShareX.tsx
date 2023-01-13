import { useState } from 'react';
import { GeneratorModal } from './GeneratorModal';

export default function ShareX({ user, open, setOpen }) {
  const [config, setConfig] = useState({
    Version: '13.2.1',
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
  });

  const onSubmit = (values) => {
    if (values.format !== 'RANDOM') {
      config.Headers['Format'] = values.format;
      setConfig(config);
    } else {
      delete config.Headers['Format'];
      setConfig(config);
    }

    if (values.imageCompression !== 0) {
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

    if (values.embed) {
      config.Headers['Embed'] = 'true';
      setConfig(config);
    } else {
      delete config.Headers['Embed'];
      setConfig(config);
    }

    if (values.noJSON) {
      config.URL = '{response}';
      config.Headers['X-Zipline-NoJSON'] = 'true';
      setConfig(config);
    } else {
      delete config.Headers['X-Zipline-NoJSON'];
      setConfig(config);
    }

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute(
      'href',
      'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, '\t'))
    );
    pseudoElement.setAttribute('download', 'zipline.sxcu');
    pseudoElement.style.display = 'none';
    document.body.appendChild(pseudoElement);
    pseudoElement.click();
    pseudoElement.parentNode.removeChild(pseudoElement);
  };

  return <GeneratorModal opened={open} onClose={() => setOpen(false)} title='ShareX' onSubmit={onSubmit} />;
}
