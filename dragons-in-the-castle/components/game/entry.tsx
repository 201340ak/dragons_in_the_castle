'use client';
/* oxlint-disable react/react-compiler -- Hydrate device-local entry and development preferences after SSR. */
import { useEffect, useState } from 'react';
import { ArrowRight, Bot, Crown, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { defaults, PLAYER_AVATARS, PLAYER_NAMES } from '@/lib/engine';
import {
  defaultDevAccount,
  DEV_ENTITLEMENTS_ENABLED,
  entitlementFeatures,
  type DevAccount,
} from '@/lib/entitlements';
import { SettingsForm, type Send } from './shared';

type Mode = 'join' | 'host' | 'bots';

export function Entry({
  send,
  busy,
  error,
}: {
  send: Send;
  busy: boolean;
  error: string;
}) {
  const [mode, setMode] = useState<Mode>('join');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(PLAYER_AVATARS[0]);
  const [code, setCode] = useState('');
  const [config, setConfig] = useState(defaults);
  const [account, setAccount] = useState<DevAccount>(defaultDevAccount);
  useEffect(() => {
    const savedName = localStorage.getItem('castle-name') || '';
    setName(PLAYER_NAMES.some((option) => option === savedName) ? savedName : '');
    const savedAvatar = localStorage.getItem('castle-avatar');
    if (PLAYER_AVATARS.includes(savedAvatar as never)) setAvatar(savedAvatar!);
    if (DEV_ENTITLEMENTS_ENABLED) {
      try {
        const saved = JSON.parse(
          localStorage.getItem('castle-dev-account') || 'null',
        ) as DevAccount | null;
        if (
          saved &&
          ['free', 'tokens', 'subscriber'].includes(saved.kind) &&
          Number.isInteger(saved.tokens)
        )
          setAccount(saved);
      } catch {}
    }
  }, []);
  const features = entitlementFeatures(account);
  const updateAccount = (next: DevAccount) => {
    setAccount(next);
    localStorage.setItem('castle-dev-account', JSON.stringify(next));
  };
  const enter = () => {
    localStorage.setItem('castle-name', name);
    localStorage.setItem('castle-avatar', avatar);
    void send(mode === 'join' ? 'join' : 'create', {
      name,
      avatar,
      code: code.trim().toUpperCase(),
      settings: config,
      demo: mode === 'bots',
    });
  };
  const title =
    mode === 'host'
      ? 'Host a game'
      : mode === 'bots'
        ? 'Play with bots'
        : 'You’re in. Almost.';
  return (
    <section className="home">
      <div className="entry-banner">
        <img src="/castle.png" alt="A moonlit castle beneath a dragon" />
        <span>Friends. Gold. A few good lies.</span>
      </div>
      <div className="panel gate">
        <h1 className="entry-title">{title}</h1>
        <p>
          {mode === 'host'
            ? 'Gather friends, add bots if needed, and shape the game.'
            : mode === 'bots'
              ? 'Choose your castle rules, then play with five bots.'
              : 'Choose an identity and enter the code from your host.'}
        </p>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enter();
          }}
        >
          <label>
            Your name
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            >
              <option value="" disabled>Choose a name</option>
              {PLAYER_NAMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="avatar-picker">
            <legend>Your avatar</legend>
            {PLAYER_AVATARS.map((option) => (
              <label
                key={option}
                className={avatar === option ? 'selected' : ''}
              >
                <input
                  type="radio"
                  name="avatar"
                  value={option}
                  aria-label={`Avatar ${option}`}
                  checked={avatar === option}
                  onChange={() => setAvatar(option)}
                />
                <span aria-hidden="true">{option}</span>
              </label>
            ))}
          </fieldset>
          {mode === 'join' ? (
            <label>
              Room code
              <input
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={code}
                maxLength={6}
                minLength={6}
                required
                onChange={(e) => setCode(e.target.value.trim().toUpperCase())}
                placeholder="ABC234"
                className="code-input"
              />
            </label>
          ) : (
            <details className="entry-settings">
              <summary>Customize game settings</summary>
              <SettingsForm value={config} onChange={setConfig} />
            </details>
          )}
          <Button
            type="submit"
            className="primary full"
            disabled={
              busy ||
              !PLAYER_NAMES.some((option) => option === name) ||
              (mode === 'join' && code.length !== 6) ||
              (mode === 'host' && !features.hostGames)
            }
          >
            {busy
              ? 'Connecting…'
              : mode === 'host'
                ? 'Create room'
                : mode === 'bots'
                  ? 'Start bot game'
                  : 'Join game'}
            {mode === 'bots' ? <Bot /> : <ArrowRight />}
          </Button>
        </form>
        {mode === 'join' ? (
          <>
            <Button
              className="secondary full topgap"
              disabled={busy || !features.hostGames}
              onClick={() => setMode('host')}
            >
              <Crown /> Host a new game
            </Button>
            {!features.hostGames && (
              <p className="tiny">Hosting requires a token or subscription.</p>
            )}
            <div className="divider">OR PLAY ON YOUR OWN</div>
            <Button
              className="quiet full"
              disabled={busy}
              onClick={() => setMode('bots')}
            >
              <Bot /> Set up a bot game
            </Button>
          </>
        ) : (
          <Button
            className="secondary full topgap"
            disabled={busy}
            onClick={() => setMode('join')}
          >
            Join an existing game
          </Button>
        )}
        {DEV_ENTITLEMENTS_ENABLED && (
          <DevEntitlementPanel account={account} onChange={updateAccount} />
        )}
      </div>
    </section>
  );
}

function DevEntitlementPanel({
  account,
  onChange,
}: {
  account: DevAccount;
  onChange: (account: DevAccount) => void;
}) {
  const features = entitlementFeatures(account);
  const entries = [
    ['Join hosted games', features.joinGames],
    ['Play bot games', features.botGames],
    ['Host games', features.hostGames],
    ['Custom host settings', features.customGameSettings],
    ['Unlimited hosting', features.unlimitedHosting],
  ] as const;
  return (
    <details className="dev-entitlements">
      <summary>
        <FlaskConical /> Development user state
      </summary>
      <label>
        Account type
        <select
          value={account.kind}
          onChange={(e) => {
            const kind = e.target.value as DevAccount['kind'];
            onChange({
              kind,
              tokens: kind === 'tokens' ? Math.max(1, account.tokens) : 0,
            });
          }}
        >
          <option value="free">Free user</option>
          <option value="tokens">Token holder</option>
          <option value="subscriber">Subscriber</option>
        </select>
      </label>
      {account.kind === 'tokens' && (
        <label>
          Hosting tokens
          <select
            value={account.tokens}
            onChange={(e) =>
              onChange({ ...account, tokens: Number(e.target.value) })
            }
          >
            {[0, 1, 5, 10, 20, 50, 100].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="feature-preview">
        {entries.map(([label, enabled]) => (
          <div key={label}>
            <span>{label}</span>
            <b className={enabled ? 'enabled' : 'disabled'}>
              {enabled ? 'Enabled' : 'Disabled'}
            </b>
          </div>
        ))}
      </div>
      <p className="tiny">
        Development preview only. No purchase or subscription is created.
      </p>
    </details>
  );
}

