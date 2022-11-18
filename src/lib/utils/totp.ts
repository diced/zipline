import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

export function generate_totp_secret() {
  return authenticator.generateSecret(32);
}

export function verify_totp_code(secret: string, code: string) {
  return authenticator.check(code, secret);
}

export async function totp_qrcode(issuer: string, username: string, secret: string): Promise<string> {
  const url = authenticator.keyuri(username, issuer, secret);

  return toDataURL(url);
}
