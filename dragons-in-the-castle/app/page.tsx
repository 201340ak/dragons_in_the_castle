'use client';
import './controller.css';
import { useEffect, useState } from 'react';
import { Castle, EyeOff, Eye, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatform } from '@/hooks/use-platform';
import { useGame } from '@/hooks/use-game';
import { Entry } from '@/components/game/entry';
import { Session } from '@/components/game/session';
import { Round } from '@/components/game/round';
export default function Home() {
  const state = useGame();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.game?.phase, state.game?.code]);
  usePlatform(state.send, !!state.game);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const protect = () => {
      if (document.hidden) setHidden(true);
    };
    document.addEventListener('visibilitychange', protect);
    return () => document.removeEventListener('visibilitychange', protect);
  }, []);
  return (
    <main className="controller-app">
      <header inert={hidden}>
        <a className="brand" href="/">
          <Castle /> DRAGONS <span>IN THE CASTLE</span>
        </a>
        {state.game ? (
          <div className="header-actions">
            <span className="connection">
              <i className={state.offline ? 'disconnected' : ''} />
              {state.offline ? 'Reconnecting' : 'Connected'}
            </span>
            <Button className="quiet" onClick={() => setHidden(true)}>
              <EyeOff /> Hide screen
            </Button>
          </div>
        ) : (
          <span className="eyebrow">A GAME OF SECRETS & SUSPICION</span>
        )}
      </header>
      <div inert={hidden}>
        {state.restoring ? (
          <section className="panel loading" aria-live="polite">
            <h2>Opening the castle gates…</h2>
            <p>Restoring your guest identity and session.</p>
          </section>
        ) : state.offline && !state.game ? (
          <section className="panel loading" aria-live="polite">
            <h2>Reconnecting to your castle…</h2>
            <p>Your saved identity is safe. We keep trying automatically.</p>
            <Button className="secondary" onClick={state.leave}>
              Return home
            </Button>
          </section>
        ) : state.game ? (
          <Session {...state} game={state.game} privacyHidden={hidden}>
            <Round
              key={`${state.game.round}-${state.game.phase}`}
              game={state.game}
              send={state.send}
              disabled={state.busy || state.offline}
            />
          </Session>
        ) : (
          <Entry send={state.send} busy={state.busy} error={state.error} />
        )}
      </div>
      {hidden && (
        <dialog
          open
          className="privacy-cover"
          aria-modal="true"
          aria-labelledby="privacy-title"
        >
          <LockKeyhole size={54} />
          <span className="eyebrow gold">SECRETS SAFELY SEALED</span>
          <h1 id="privacy-title">Nothing to see here.</h1>
          <p>Your screen is covered. The game clock keeps running.</p>
          <Button
            className="primary"
            autoFocus
            onClick={() => setHidden(false)}
          >
            I’m ready to return <Eye />
          </Button>
        </dialog>
      )}
    </main>
  );
}


