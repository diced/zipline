import { GeneratorModal } from './GeneratorModal';

export default function ShareX({ user, open, setOpen }) {
  const onSubmit = (values) => {
    const hostname = window.location.hostname;

    const config = {
      Version: '14.1.0',
      Name: `Zipline - ${hostname} - ${values.type === 'upload-file' ? 'File' : 'URL'}`,
      DestinationType: 'ImageUploader, TextUploader, FileUploader',
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
      URL: '{json:files[0]}',
      Body: 'MultipartFormData',
      FileFormName: 'file',
      Data: undefined,
    };

    if (values.type === 'shorten-url') {
      config.RequestURL = `${
        window.location.protocol +
        '//' +
        window.location.hostname +
        (window.location.port ? ':' + window.location.port : '')
      }/api/shorten`;
      config.URL = '{json:url}';
      config.Body = 'JSON';
      config.DestinationType = 'URLShortener,URLSharingService';
      delete config.FileFormName;
      config.Data = JSON.stringify({ url: '{input}' });
    } else {
      delete config.Data;
    }

    if (values.format !== 'RANDOM' && values.type === 'upload-file') {
      config.Headers['Format'] = values.format;
    } else {
      delete config.Headers['Format'];
    }

    if (values.imageCompression !== 0 && values.type === 'upload-file') {
      config.Headers['Image-Compression-Percent'] = values.imageCompression;
    } else {
      delete config.Headers['Image-Compression-Percent'];
    }

    if (values.zeroWidthSpace) {
      config.Headers['Zws'] = 'true';
    } else {
      delete config.Headers['Zws'];
    }

    if (values.embed && values.type === 'upload-file') {
      config.Headers['Embed'] = 'true';
    } else {
      delete config.Headers['Embed'];
    }

    if (values.noJSON) {
      config.URL = '{response}';
      config.Headers['No-JSON'] = 'true';
    } else {
      delete config.Headers['No-JSON'];
      config.URL = values.type === 'upload-file' ? '{json:files[0]}' : '{json:url}';
    }

    if (values.originalName && values.type === 'upload-file') {
      config.Headers['Original-Name'] = 'true';
    } else {
      delete config.Headers['Original-Name'];
    }

    if (values.overrideDomain && values.overrideDomain.trim() !== '') {
      config.Headers['Override-Domain'] = values.overrideDomain;
    } else {
      delete config.Headers['Override-Domain'];
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
