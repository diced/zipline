import { generateSecret, generateURI, verify } from 'otplib';
import { toDataURL } from 'qrcode';

export function generateKey(): string {
  return generateSecret({
    length: 16,
  });
}

export async function verifyTotpCode(code: string, secret: string): Promise<boolean> {
  const result = await verify({
    secret,
    token: code,
    epochTolerance: 30,
  });

  return result.valid;
}

export function totpQrcode({
  issuer,
  username,
  secret,
}: {
  issuer?: string;
  username: string;
  secret: string;
}): Promise<string> {
  return toDataURL(
    generateURI({
      secret,
      issuer: issuer ?? 'Zipline',
      label: username,
    }),
  );
}
