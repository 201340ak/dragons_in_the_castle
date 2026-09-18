import { env } from 'cloudflare:workers';
import { handleAccount } from '@/lib/account';

// Supabase's default sender limits delivery to project team members for testing.
const handler = (req: Request) =>
  handleAccount(req, {
    emailEnabled:
      (env as unknown as { ACCOUNT_EMAIL_ENABLED?: string })
        .ACCOUNT_EMAIL_ENABLED !== 'false',
  });
export const GET = handler;
export const POST = handler;
