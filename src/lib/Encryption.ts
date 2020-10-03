import aes from 'crypto-js/aes'

export function encrypt(data: any) {
  return aes.encrypt(JSON.stringify(data), "my-secret").toString();
}

export function decrypt(data: any) {
  return aes.decrypt(data, "my-secret").toString();
}