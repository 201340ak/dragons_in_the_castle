import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleAccount,
  handleAccountCallback,
  client,
} from '../lib/account.ts';
import type { AccountOptions } from '../lib/account.ts';

const origin = 'https://castle.example';
function request(body?: unknown, cookie?: string, source = origin) {
  return new Request(origin + '/api/account', {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Origin: source,
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const user = {
  id: 'verified-provider-id',
  email: 'player@example.com',
  email_confirmed_at: '2026-09-18',
  user_metadata: {},
};
const session = {
  access_token: 'access-test',
  refresh_token: 'refresh-test',
  expires_in: 3600,
};
function options(overrides = {}): AccountOptions {
  return {
    emailEnabled: true,
    client: () =>
      ({
        auth: {
          getUser: async () => ({ data: { user }, error: null }),
          exchangeCodeForSession: async () => ({
            data: { user, session },
            error: null,
          }),
          refreshSession: async () => ({
            data: { user, session },
            error: null,
          }),
          signInWithOtp: async () => ({ error: null }),
          admin: { signOut: async () => ({ error: null }) },
          ...overrides,
        },
      }) as unknown as ReturnType<NonNullable<AccountOptions['client']>>,
  };
}

void test('account status is anonymous without a provider session, regardless of guest bearer', async () => {
  const req = request();
  req.headers.set('Authorization', 'Bearer ' + 'a'.repeat(64));
  const response = await handleAccount(req, options());
  assert.deepEqual(await response.json(), {
    account: null,
    emailEnabled: true,
  });
  assert.match(response.headers.get('cache-control')!, /no-store/);
});

void test('mutations reject absent and foreign origins and non-JSON requests', async () => {
  for (const source of ['', 'https://attacker.example']) {
    assert.equal(
      (
        await handleAccount(
          request({ action: 'logout' }, undefined, source),
          options(),
        )
      ).status,
      403,
    );
  }
  const req = request({ action: 'logout' });
  req.headers.set('Content-Type', 'text/plain');
  assert.equal((await handleAccount(req, options())).status, 403);
});

void test('disabled delivery cannot send sign-in links', async () => {
  for (const action of ['request-link']) {
    assert.equal(
      (
        await handleAccount(
          request({ action, email: 'player@example.com', code: '123456' }),
          { ...options(), emailEnabled: false },
        )
      ).status,
      503,
    );
  }
});

void test('invalid and oversized input is rejected before contacting the provider', async () => {
  assert.equal(
    (
      await handleAccount(
        request({ action: 'request-link', email: 'bad' }),
        options(),
      )
    ).status,
    400,
  );
  assert.equal(
    (await handleAccount(request({ excess: 'x'.repeat(3000) }), options()))
      .status,
    413,
  );
});

void test('valid PKCE callback issues private secure cookies and exposes no tokens in JSON', async () => {
  const response = await handleAccountCallback(callback(), options());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/?account=signed-in');
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const c of cookies) {
    assert.match(c, /^__Host-castle-/);
    assert.match(c, /HttpOnly; SameSite=Lax; Secure/);
    assert.match(c, /Path=\//);
    assert.doesNotMatch(c, /Domain=/);
  }
  assert.equal(await response.text(), '');
});

void test('invalid or unverified callback never establishes an account', async () => {
  for (const result of [
    { data: { user: null, session: null }, error: { status: 403 } },
    {
      data: { user: { ...user, email_confirmed_at: null }, session },
      error: null,
    },
  ]) {
    const response = await handleAccountCallback(
      callback(),
      options({ exchangeCodeForSession: async () => result }),
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/?account=link-expired');
    assert.equal(response.headers.getSetCookie().length, 0);
  }
});

void test('expired sessions refresh through Supabase and replace cookies', async () => {
  const response = await handleAccount(
    request(
      undefined,
      '__Host-castle-access=expired; __Host-castle-refresh=valid',
    ),
    options({
      getUser: async () => ({ data: { user: null }, error: { status: 401 } }),
    }),
  );
  assert.equal(
    ((await response.json()) as { account: { id: string } | null }).account?.id,
    user.id,
  );
  assert.equal(response.headers.getSetCookie().length, 2);
});

void test('forged sessions fail closed; provider outages preserve cookies for retry', async () => {
  const bad = options({
    getUser: async () => ({ data: {}, error: { status: 401 } }),
    refreshSession: async () => ({ data: {}, error: { status: 400 } }),
  });
  const response = await handleAccount(
    request(
      undefined,
      '__Host-castle-access=forged; __Host-castle-refresh=forged',
    ),
    bad,
  );
  assert.equal(
    ((await response.json()) as { account: { id: string } | null }).account,
    null,
  );
  assert.ok(
    response.headers.getSetCookie().every((c) => c.includes('Max-Age=0')),
  );
  const down = await handleAccount(
    request(undefined, '__Host-castle-access=valid'),
    options({ getUser: async () => ({ data: {}, error: { status: 503 } }) }),
  );
  assert.equal(down.status, 503);
  assert.equal(down.headers.getSetCookie().length, 0);
});

void test('profile updates require a verified account and validate display-only fields', async () => {
  assert.equal(
    (
      await handleAccount(
        request({
          action: 'profile',
          name: 'Player',
          avatar: '🧙',
          id: 'someone-else',
        }),
        options(),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handleAccount(
        request(
          {
            action: 'profile',
            name: 'Player',
            avatar: 'https://tracker.example',
          },
          '__Host-castle-access=valid',
        ),
        options(),
      )
    ).status,
    400,
  );
});

void test('logout clears both account cookies, even during provider failure', async () => {
  const response = await handleAccount(
    request(
      { action: 'logout' },
      '__Host-castle-access=valid; castle-guest=guest-seat',
    ),
    options({
      admin: {
        signOut: async () => {
          throw Error('offline');
        },
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(
    ((await response.json()) as { account: { id: string } | null }).account,
    null,
  );
  assert.ok(
    response.headers.getSetCookie().every((c) => c.includes('Max-Age=0')),
  );
  assert.ok(response.headers.getSetCookie().every((c) => !c.includes('guest')));
});

function callback() {
  return new Request(origin + '/api/account/callback?code=provider-code-123', {
    headers: { Cookie: '__Host-castle-pkce=dmVyaWZpZXI' },
  });
}
void test('callbacks require same-browser verifier and never honor return URLs', async () => {
  const r = await handleAccountCallback(
    new Request(
      origin +
        '/api/account/callback?code=provider-code-123&returnTo=https://attacker.example',
    ),
    options(),
  );
  assert.equal(r.headers.get('location'), '/?account=link-expired');
  assert.equal(r.headers.getSetCookie().length, 0);
});

void test('official SDK binds the email link to an HttpOnly PKCE verifier and exchanges it', async () => {
  let challenge = '';
  let verifier = '';
  const transport: typeof fetch = async (url, init) => {
    assert.equal(typeof init?.body, 'string');
    assert.equal(typeof url, 'string');
    const body = JSON.parse(init?.body as string) as Record<string, string>;
    if ((url as string).includes('/otp')) {
      challenge = body.code_challenge;
      assert.equal(body.code_challenge_method, 's256');
      assert.ok(
        (url as string).includes(
          encodeURIComponent(origin + '/api/account/callback'),
        ),
      );
      return Response.json({});
    }
    assert.ok((url as string).includes('grant_type=pkce'));
    verifier = body.code_verifier;
    assert.equal(body.auth_code, 'provider-code-123');
    return Response.json({ ...session, user, token_type: 'bearer' });
  };
  const setup = {
    emailEnabled: true,
    client: (req: Request, headers: Headers) => client(req, headers, transport),
  };
  const sent = await handleAccount(
    request({ action: 'request-link', email: user.email }),
    setup,
  );
  assert.equal(sent.status, 200);
  const cookies = sent.headers.getSetCookie();
  const pending = cookies.find((c) => c.startsWith('__Host-castle-pkce='));
  assert.ok(pending);
  assert.match(pending, /HttpOnly; SameSite=Lax; Secure/);
  const r = await handleAccountCallback(
    new Request(origin + '/api/account/callback?code=provider-code-123', {
      headers: { Cookie: pending.split(';')[0] },
    }),
    setup,
  );
  assert.equal(r.headers.get('Location'), '/?account=signed-in');
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  assert.equal(Buffer.from(hash).toString('base64url'), challenge);
  assert.ok(
    r.headers
      .getSetCookie()
      .some((c) => c.startsWith('__Host-castle-pkce=; Max-Age=0')),
  );
});

void test('profile saves only allowed metadata for the verified identity', async () => {
  const r = await handleAccount(
    request(
      {
        action: 'profile',
        id: 'other-user',
        email: 'other@example.com',
        name: 'Alexis',
        avatar: '🦉',
        role: 'admin',
      },
      '__Host-castle-access=verified-token',
    ),
    {
      ...options(),
      transport: async (_url, init) => {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get('authorization'), 'Bearer verified-token');
        assert.deepEqual(JSON.parse(init?.body as string), {
          data: { castle_name: 'Alexis', castle_avatar: '🦉' },
        });
        return Response.json({
          ...user,
          user_metadata: { castle_name: 'Alexis', castle_avatar: '🦉' },
        });
      },
    },
  );
  assert.equal(r.status, 200);
  const data = (await r.json()) as { account: { id: string; name: string } };
  assert.equal(data.account.id, user.id);
  assert.equal(data.account.name, 'Alexis');
});
