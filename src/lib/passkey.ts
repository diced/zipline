import {
  parseCreationOptionsFromJSON,
  parseRequestOptionsFromJSON,
  create,
  get,
  supported,
  RegistrationResponseJSON,
  RegistrationPublicKeyCredential,
} from '@github/webauthn-json/browser-ponyfill';
import { User } from './db/models/user';

function randomCharacters(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  let result = '';

  for (let i = 0; i !== length; ++i) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

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

  return create(cro)
}

export async function authenticateWeb() {
  const cro = parseRequestOptionsFromJSON({
    publicKey: {
      challenge: randomCharacters(64),
    },
  });

  return get(cro);
}
