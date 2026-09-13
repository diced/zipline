import assert from 'assert/strict';
import { test } from 'node:test';
import { formatRootUrl } from '@/lib/url';

test('formatRootUrl encodes filenames so separators cannot change the URL structure', () => {
  assert.equal(formatRootUrl('/raw', '../photo ?#&.png'), '/raw/..%2Fphoto%20%3F%23%26.png');
  assert.equal(formatRootUrl('/raw', '%2Fsecret.png'), '/raw/%252Fsecret.png');
});

test('formatRootUrl handles the root route and encodes query values', () => {
  assert.equal(formatRootUrl('/', 'photo.png'), '/photo.png');
  assert.equal(
    formatRootUrl('/', 'photo.png', { download: 'a&b=1', empty: '', absent: null, missing: undefined }),
    '/photo.png?download=a%26b%3D1&empty=',
  );
});
