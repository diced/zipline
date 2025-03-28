const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CHARSET_LENGTH = CHARSET.length;

export function randomCharacters(length: number) {
  const randomValues = new Uint8Array(length);

  typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(randomValues)
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('crypto').webcrypto.getRandomValues(randomValues);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += CHARSET[randomValues[i] % CHARSET_LENGTH];
  }

  return result;
}

export function randomIndex(length: number) {
  const randomValues = new Uint8Array(1);

  typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(randomValues)
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('crypto').webcrypto.getRandomValues(randomValues);

  return randomValues[0] % length;
}
