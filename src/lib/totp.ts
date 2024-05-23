import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

export function generateKey() {
  return authenticator.generateSecret(16);
}

export function verifyTotpCode(code: string, secret: string) {
  return authenticator.check(code, secret);
}

export function totpQrcode({
  issuer,
  username,
  secret,
}: {
  issuer?: string;
  username: string;
  secret: string;
}) {
  return toDataURL(authenticator.keyuri(username, issuer ?? 'Zipline', secret), {
    width: 180,
  });
}
