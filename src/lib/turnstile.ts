import { log } from './logger';

const logger = log('lib').c('turnstile');

export async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      logger.error('Turnstile verification request failed', { status: response.status });
      return false;
    }

    const data = await response.json();

    if (data.success) {
      logger.debug('Turnstile verification successful');
      return true;
    } else {
      logger.warn('Turnstile verification failed', { errorCodes: data['error-codes'] });
      return false;
    }
  } catch (error) {
    logger.error('Turnstile verification error').error(error as Error);
    return false;
  }
}
