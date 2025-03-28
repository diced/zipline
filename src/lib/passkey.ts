import {
  parseCreationOptionsFromJSON,
  parseRequestOptionsFromJSON,
  create,
  get,
} from '@github/webauthn-json/browser-ponyfill';
import { User } from './db/models/user';
import { randomCharacters } from './random';

export async function registerWeb(user: User) {
  const cro = parseCreationOptionsFromJSON({
    publicKey: {
      challenge: randomCharacters(64),
      rp: { name: 'Zipline' },
      user: {
        id: randomCharacters(64),
        name: user.username,
        displayName: user.username,
      },
      pubKeyCredParams: [],
      authenticatorSelection: {
        userVerification: 'preferred',
        authenticatorAttachment: 'cross-platform',
        requireResidentKey: true,
      },
    },
  });

  return create(cro);
}

export async function authenticateWeb() {
  const cro = parseRequestOptionsFromJSON({
    publicKey: {
      challenge: randomCharacters(64),
    },
  });

  return get(cro);
}
