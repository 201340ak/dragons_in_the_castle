'use client';
/* oxlint-disable react/react-compiler -- Account status and callback notices are hydrated from the browser. */
import { useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ACCOUNT_AVATARS, type Account } from '@/lib/account-profile';
import './account.css';

export function AccountMenu({ concealed }: { concealed: boolean }) {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(ACCOUNT_AVATARS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const locked = useRef(false);
  const available = !import.meta.env?.VITE_API_BASE_URL; // Native cross-origin accounts are a later milestone.
  const accept = (next: Account | null) => {
    setAccount(next);
    setName(next?.name || '');
    setAvatar(next?.avatar || ACCOUNT_AVATARS[0]);
  };
  useEffect(() => {
    if (!available) return;
    let active = true;
    fetch('/api/account', {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<{
          account: Account | null;
          emailEnabled: boolean;
        }>;
      })
      .then((data) => {
        if (active) {
          accept(data.account);
          setEnabled(data.emailEnabled);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'Account service is unavailable. You can still play as a guest.',
          );
          setLoaded(true);
        }
      });
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get('account');
    if (outcome) {
      setOpen(true);
      if (outcome === 'link-expired')
        setError(
          'This sign-in link could not be used. Open the newest link in the same browser where you requested it, or request another.',
        );
      if (outcome === 'signed-in')
        setMessage('Signed in. Choose your account name and portrait.');
      url.searchParams.delete('account');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    return () => {
      active = false;
    };
  }, [available]);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const send = async (action: string) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'request-link'
            ? { email }
            : action === 'profile'
              ? { name, avatar }
              : {}),
        }),
        signal: AbortSignal.timeout(20000),
        cache: 'no-store',
      });
      const data = (await r.json()) as {
        account: Account | null;
        error?: string;
      };
      if (!r.ok) {
        if (r.status === 429) setRetryAt(Date.now() + 60000);
        throw Error(data.error || 'Please try again.');
      }
      if (action === 'request-link') {
        setRetryAt(Date.now() + 60000);
        setMessage(
          'Check your email. Open the newest sign-in link in this same browser. Requesting a new link replaces the previous one.',
        );
      } else {
        accept(data.account);
        setMessage(
          action === 'logout'
            ? 'Signed out of your account. Your game is unchanged.'
            : 'Profile saved.',
        );
      }
    } catch (e) {
      setError(
        e instanceof Error && e.name !== 'TimeoutError'
          ? e.message
          : 'The request timed out. Please try again.',
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  if (!available) return null;
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  return (
    <>
      <Button
        className="quiet account-toggle"
        onClick={() => setOpen(true)}
        aria-label={account ? 'Your account' : 'Sign in'}
      >
        <UserRound />
        <span>{account ? 'Account' : 'Sign in'}</span>
      </Button>
      <Dialog open={open && !concealed} onOpenChange={setOpen}>
        <DialogContent className="account-panel">
          <DialogTitle>
            {account ? 'Your account' : 'Sign in or create an account'}
          </DialogTitle>
          <DialogDescription>
            {account
              ? 'Your account profile is separate from your character in each game.'
              : 'Get a sign-in link by email. No password needed. Guests can still join a game with a room code.'}
          </DialogDescription>
          {!loaded ? (
            <output>Checking your account…</output>
          ) : account ? (
            <>
              <p className="account-email">{account.email}</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send('profile');
                }}
              >
                <label htmlFor="account-name">Account name</label>
                <input
                  id="account-name"
                  autoComplete="username"
                  required
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
                <fieldset disabled={busy}>
                  <legend>Portrait</legend>
                  <div className="account-portraits">
                    {ACCOUNT_AVATARS.map((a, i) => (
                      <label key={a}>
                        <input
                          type="radio"
                          name="account-avatar"
                          value={a}
                          checked={avatar === a}
                          onChange={() => setAvatar(a)}
                          aria-label={
                            [
                              'Wizard',
                              'Shield',
                              'Archer',
                              'Key',
                              'Scroll',
                              'Owl',
                              'Swords',
                              'Compass',
                            ][i]
                          }
                        />
                        <span aria-hidden="true">{a}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Button type="submit" className="primary" disabled={busy}>
                  {busy ? 'Please wait…' : 'Save profile'}
                </Button>
              </form>
              <Button
                className="secondary"
                disabled={busy}
                onClick={() => void send('logout')}
              >
                Sign out
              </Button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send('request-link');
              }}
            >
              <p className="account-test-note">
                Email sign-in is currently available for the owner’s test
                account only.
              </p>
              <label htmlFor="account-email">Email address</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy || !enabled}
              />
              <Button
                type="submit"
                className="primary"
                disabled={busy || !enabled || remaining > 0}
              >
                {busy
                  ? 'Sending…'
                  : remaining > 0
                    ? `Send again in ${remaining}s`
                    : 'Email me a sign-in link'}
              </Button>
              {!enabled && <p>Email sign-in is not available yet.</p>}
            </form>
          )}
          {message && <output>{message}</output>}
          {error && (
            <p role="alert" className="account-error">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
