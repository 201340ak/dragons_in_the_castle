import { createClient, type Session, type User } from '@supabase/supabase-js';

// Public project coordinates, never an administrative/service-role credential.
export const AUTH_URL = 'https://xxxnehnmfcgpvzemxbsr.supabase.co';
export const AUTH_PUBLISHABLE_KEY =
  'sb_publishable_FiDVIJAC_NsJ0PzYH-WA0g_cADvAxCf';
import { ACCOUNT_AVATARS, type Account } from './account-profile.ts';
type Client = ReturnType<typeof client>;
export type AccountOptions = {
  emailEnabled: boolean;
  client?: (req: Request, headers: Headers) => Client;
  transport?: typeof fetch;
};

export function client(
  req: Request,
  headers: Headers,
  transport: typeof fetch = fetch,
) {
  const names = cookieNames(req);
  const pending = names.access.replace('access', 'pkce');
  const storage = new Map<string, string>();
  const saved = cookie(req, pending);
  if (saved) {
    try {
      storage.set(
        'castle-auth-code-verifier',
        atob(saved.replace(/-/g, '+').replace(/_/g, '/')),
      );
    } catch {
      /* Ignore malformed cookies. */
    }
  }
  const writeVerifier = (value: string | null) => {
    const encoded = value
      ? btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
      : '';
    headers.append(
      'Set-Cookie',
      pending +
        '=' +
        encoded +
        '; Max-Age=' +
        (value ? 3600 : 0) +
        '; Path=/; HttpOnly; SameSite=Lax' +
        (names.secure ? '; Secure' : ''),
    );
  };
  return createClient(AUTH_URL, AUTH_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: 'castle-auth',
      storage: {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => {
          storage.set(key, value);
          if (key === 'castle-auth-code-verifier') writeVerifier(value);
        },
        removeItem: (key) => {
          storage.delete(key);
          if (key === 'castle-auth-code-verifier') writeVerifier(null);
        },
      },
    },
    global: {
      fetch: (url, init) =>
        transport(url, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  });
}

function profile(user: User): Account {
  const name = user.user_metadata?.castle_name;
  const avatar = user.user_metadata?.castle_avatar;
  return {
    id: user.id,
    email: user.email || '',
    name: typeof name === 'string' ? name.slice(0, 30) : '',
    avatar: ACCOUNT_AVATARS.includes(avatar) ? avatar : ACCOUNT_AVATARS[0],
  };
}

function cookieNames(req: Request) {
  const secure = new URL(req.url).protocol === 'https:';
  const prefix = secure ? '__Host-castle-' : 'castle-local-';
  return { access: prefix + 'access', refresh: prefix + 'refresh', secure };
}

function cookie(req: Request, name: string) {
  const value = (req.headers.get('cookie') || '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1);
  return value && /^[A-Za-z0-9._~-]+$/.test(value) && value.length < 3800
    ? value
    : '';
}

function sessionCookies(
  req: Request,
  headers: Headers,
  session: Session | null,
) {
  const names = cookieNames(req);
  const suffix = `; Path=/; HttpOnly; SameSite=Lax${names.secure ? '; Secure' : ''}`;
  for (const [name, value, age] of [
    [names.access, session?.access_token || '', session?.expires_in || 0],
    [
      names.refresh,
      session?.refresh_token || '',
      session ? 60 * 60 * 24 * 30 : 0,
    ],
  ]) {
    headers.append('Set-Cookie', `${name}=${value}; Max-Age=${age}${suffix}`);
  }
}

// Authentication always comes from Supabase. Profile metadata is display-only;
// never use it for game ownership, entitlements or authorization decisions.
async function authenticate(req: Request, auth: Client, headers: Headers) {
  const names = cookieNames(req);
  const access = cookie(req, names.access);
  const refresh = cookie(req, names.refresh);
  if (!access && !refresh) return null;
  if (access) {
    const { data, error } = await auth.auth.getUser(access);
    if (!error && data.user) return { user: data.user, access };
    if (error && (!error.status || error.status >= 500))
      throw new Error('provider unavailable');
  }
  if (refresh) {
    const { data, error } = await auth.auth.refreshSession({
      refresh_token: refresh,
    });
    if (!error && data.session && data.user) {
      sessionCookies(req, headers, data.session);
      return { user: data.user, access: data.session.access_token };
    }
    if (error && (!error.status || error.status >= 500))
      throw new Error('provider unavailable');
  }
  sessionCookies(req, headers, null);
  return null;
}

export async function handleAccount(
  req: Request,
  options: AccountOptions,
): Promise<Response> {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    Vary: 'Cookie, Origin',
    'X-Content-Type-Options': 'nosniff',
  });
  const reply = (body: object, status = 200) =>
    Response.json(body, { status, headers });
  const fail = (error: string, status = 400) => reply({ error }, status);
  if (req.method !== 'GET' && req.method !== 'POST')
    return fail('Method not allowed.', 405);
  if (
    req.method === 'POST' &&
    (req.headers.get('origin') !== new URL(req.url).origin ||
      !req.headers.get('content-type')?.startsWith('application/json'))
  ) {
    return fail('Please use the sign-in form on this site.', 403);
  }
  try {
    const auth = (options.client || client)(req, headers); // A fresh client per request: no shared sessions.
    if (req.method === 'GET') {
      const identity = await authenticate(req, auth, headers);
      return reply({
        account: identity ? profile(identity.user) : null,
        emailEnabled: options.emailEnabled,
      });
    }
    // Bound input before parsing, even if Content-Length is missing or dishonest.
    const reader = req.body?.getReader();
    if (!reader) return fail('Missing request.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2048) {
        await reader.cancel();
        return fail('Request too large.', 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return fail('Invalid request.');
    }
    if (!body || typeof body !== 'object') return fail('Invalid request.');
    if (body.action === 'logout') {
      const access = cookie(req, cookieNames(req).access);
      // Clear this browser even when the provider cannot be reached. Other devices
      // are deliberately unaffected. A copied access token lasts until JWT expiry.
      sessionCookies(req, headers, null);
      if (access)
        await auth.auth.admin.signOut(access, 'local').catch(() => undefined);
      return reply({ account: null });
    }
    if (body.action === 'request-link') {
      if (!options.emailEnabled)
        return fail(
          'Email sign-in is being set up. You can still play as a guest.',
          503,
        );
      const email =
        typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return fail('Enter a valid email address.');
      const { error } = await auth.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: new URL('/api/account/callback', req.url).href,
        },
      });
      if (error)
        return fail(
          error.status === 429
            ? 'Please wait before requesting another link.'
            : 'We couldn’t send a link. Email sign-in is currently limited to the owner’s test account.',
          error.status === 429 ? 429 : 503,
        );
      return reply({ sent: true });
    }
    if (body.action === 'profile') {
      const identity = await authenticate(req, auth, headers);
      if (!identity) return fail('Please sign in again.', 401);
      const name: string =
        typeof body.name === 'string' ? body.name.trim() : '';
      if (
        !name ||
        name.length > 30 ||
        Array.from(name).some(
          (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
        )
      )
        return fail('Choose a name between 1 and 30 characters.');
      if (!ACCOUNT_AVATARS.includes(body.avatar))
        return fail('Choose one of the available portraits.');
      // Use the verified user's token; callers cannot select a different account.
      const response = await (options.transport || fetch)(
        `${AUTH_URL}/auth/v1/user`,
        {
          method: 'PUT',
          headers: {
            apikey: AUTH_PUBLISHABLE_KEY,
            Authorization: `Bearer ${identity.access}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: { castle_name: name, castle_avatar: body.avatar },
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok)
        return fail('Your profile could not be saved. Please try again.', 503);
      return reply({ account: profile((await response.json()) as User) });
    }
    return fail('Unknown account action.');
  } catch {
    return fail(
      'Account service is temporarily unavailable. Please try again.',
      503,
    );
  }
}

export async function handleAccountCallback(
  req: Request,
  options: AccountOptions,
): Promise<Response> {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  });
  const finish = (success: boolean) => {
    headers.set(
      'Location',
      '/?account=' + (success ? 'signed-in' : 'link-expired'),
    );
    return new Response(null, { status: 303, headers });
  };
  const code = new URL(req.url).searchParams.get('code');
  const pending = cookie(
    req,
    cookieNames(req).access.replace('access', 'pkce'),
  );
  if (
    !options.emailEnabled ||
    !pending ||
    !code ||
    !/^[a-zA-Z0-9_-]{10,200}$/.test(code)
  )
    return finish(false);
  try {
    const auth = (options.client || client)(req, headers);
    const { data, error } = await auth.auth.exchangeCodeForSession(code);
    if (error || !data.session || !data.user?.email_confirmed_at)
      return finish(false);
    sessionCookies(req, headers, data.session);
    return finish(true);
  } catch {
    return finish(false);
  }
}
