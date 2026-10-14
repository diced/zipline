import assert from 'assert/strict';
import { test } from 'node:test';
import {
  defaultEphemeralOptions,
  defaultUploadOptions,
  mergeUploadOptions,
  persistUploadOptions,
  type UploadOptionsStore,
} from '@/lib/client/store/uploadOptions';

test('upload options persistence excludes ephemeral values, including legacy stored values', () => {
  const state = {
    options: defaultUploadOptions,
    ephemeral: defaultEphemeralOptions,
  } as UploadOptionsStore;
  const stateWithEphemeral: UploadOptionsStore = {
    ...state,
    ephemeral: { password: 'file-password', filename: 'temporary-name', folderId: 'temporary-folder' },
  };

  assert.deepEqual(persistUploadOptions(stateWithEphemeral), { options: state.options });

  const merged = mergeUploadOptions(
    {
      options: { ...state.options, addOriginalName: true },
      ephemeral: stateWithEphemeral.ephemeral,
    },
    state,
  );

  assert.equal(merged.options.addOriginalName, true);
  assert.deepEqual(merged.ephemeral, state.ephemeral);
});
