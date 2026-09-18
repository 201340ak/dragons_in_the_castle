import { env } from 'cloudflare:workers';
import { handleAccountCallback } from '@/lib/account';
export const GET = (req: Request) =>
  handleAccountCallback(req, {
    emailEnabled:
      (env as unknown as { ACCOUNT_EMAIL_ENABLED?: string })
        .ACCOUNT_EMAIL_ENABLED !== 'false',
  });
