'use client';
/* oxlint-disable react/react-compiler -- Hydrate the nickname from browser storage after SSR. */
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { defaults } from '@/lib/engine';
import { SettingsForm, type Send } from './shared';
export function Entry({
  send,
  busy,
  error,
}: {
  send: Send;
  busy: boolean;
  error: string;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [config, setConfig] = useState(defaults);
  useEffect(() => {
    setName(localStorage.getItem('castle-name') || '');
  }, []);
  const enter = (type: string, demo = false) => {
    localStorage.setItem('castle-name', name);
    void send(type, {
      name,
      code: code.trim().toUpperCase(),
      settings: config,
      demo,
    });
  };
  return (
    <section className="home">
      <div className="entry-banner">
        <img src="/castle.png" alt="A moonlit castle beneath a dragon" />
        <span>Friends. Gold. A few good lies.</span>
      </div>
      <div className="panel gate">
        <h1 className="entry-title">
          {creating ? 'Host a game' : 'You’re in. Almost.'}
        </h1>
        <p>
          {creating
            ? 'Gather 4–12 players. Everyone uses their own phone.'
            : 'Enter your name and the code from your host.'}
        </p>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enter(creating ? 'create' : 'join');
          }}
        >
          <label>
            Your name
            <input
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your table name"
              minLength={2}
              maxLength={20}
              required
            />
          </label>
          {creating ? (
            <details className="entry-settings">
              <summary>Customize game settings</summary>
              <SettingsForm value={config} onChange={setConfig} />
            </details>
          ) : (
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
          )}
          <Button
            type="submit"
            className="primary full"
            disabled={
              busy || name.trim().length < 2 || (!creating && code.length !== 6)
            }
          >
            {busy ? 'Connecting…' : creating ? 'Create room' : 'Join game'}
            <ArrowRight />
          </Button>
        </form>
        <Button
          className="secondary full topgap"
          disabled={busy}
          onClick={() => setCreating(!creating)}
        >
          {creating ? 'Join an existing game' : 'Host a new game'}
        </Button>
        <div className="divider">JUST LOOKING AROUND?</div>
        <Button
          className="quiet full"
          disabled={busy || name.trim().length < 2}
          onClick={() => enter('create', true)}
        >
          <Sparkles />
          Play with bots
        </Button>
        <p className="tiny">
          No account needed. Bot play includes five computer-controlled players.
        </p>
      </div>
    </section>
  );
}
