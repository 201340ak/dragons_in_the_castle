'use client';
import { useState } from 'react';
import {
  Coins,
  BookOpen,
  Castle,
  LockKeyhole,
  Sparkles,
  Shield,
  Search,
  Flame,
  ScrollText,
  Check,
  Vote,
  Eye,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ACTIONS, type View } from '@/lib/engine';
import { AvatarBadge, GameButton, Gold, resultText, type Send } from './shared';
const descriptions: Record<string, string> = {
  'Count Coins': 'Discover how much gold remains.',
  'Guard Room': 'Stop every theft in your room.',
  Investigate: 'Learn what kinds of actions took place.',
  'Steal Coins': 'Take gold. Keep your story straight.',
};
const icons = [Coins, BookOpen, Castle, LockKeyhole, Sparkles];
export function Round({
  game,
  send,
  disabled,
}: {
  game: View;
  send: Send;
  disabled: boolean;
}) {
  const existingClaim = game.claims[game.me.id];
  const truthfulChoice = game.me.role === 'Wizard' ? game.me.choice : undefined;
  const truthfulResult =
    game.me.role === 'Wizard' && game.me.result
      ? resultText(game.me.result)
      : '';
  const [choosingAction, setChoosingAction] = useState(false);
  const [theftAmount, setTheftAmount] = useState(
    game.settings.stealMin ?? game.settings.steal,
  );
  const [room, setRoom] = useState(
      existingClaim?.room || truthfulChoice?.room || game.settings.rooms[0],
    ),
    [action, setAction] = useState(
      existingClaim?.action || truthfulChoice?.action || 'Count Coins',
    ),
    [target, setTarget] = useState('skip'),
    [claimText, setClaimText] = useState(
      existingClaim
        ? [existingClaim.result, existingClaim.statement]
            .filter(Boolean)
            .join('\n\n')
        : truthfulResult,
    ),
    [notice, setNotice] = useState('');
  const bounds = game.me.theftBounds?.[room];
  const amount = bounds
    ? Math.max(bounds.min, Math.min(theftAmount, bounds.max))
    : theftAmount;
  const next = (label: string) => (
    <GameButton
      disabled={disabled || game.ack}
      onClick={() => void send('ack')}
    >
      {game.ack ? 'Waiting for the fellowship…' : label}
    </GameButton>
  );
  let content: React.ReactNode;
  if (game.phase === 'over')
    content = (
      <div className="panel">
        <Trophy className="hero-icon" />
        <span className="eyebrow">THE CASTLE CHRONICLE</span>
        <h2>{game.winner} win!</h2>
        <p>
          {game.winner === 'Wizards'
            ? 'Every Dragon has been banished. The castle is safe.'
            : 'The last coin is gone. The Dragons have taken the castle’s fortune.'}
        </p>
        <div className="player-grid">
          {game.players.map((p, i) => (
            <div className="player-tile" key={p.id}>
              <AvatarBadge player={p} index={i} />
              <div>
                <strong>{p.name}</strong>
                <small className={p.role === 'Dragon' ? 'red' : 'blue'}>
                  {p.role} · {p.active ? 'Survived' : 'Banished'}
                </small>
              </div>
            </div>
          ))}
        </div>
        <h3>Final gold</h3>
        <Gold rooms={game.coins || {}} />
        <h3>Every secret, revealed</h3>
        {game.history?.map((r) => (
          <details key={r.number} className="chronicle">
            <summary>
              Round {r.number} ·{' '}
              {r.banished
                ? `${game.players.find((p) => p.id === r.banished)?.name} banished`
                : 'No banishment'}
            </summary>
            {Object.entries(r.choices).map(([id, c]) => (
              <p key={id}>
                <strong>{game.players.find((p) => p.id === id)?.name}</strong> ·{' '}
                {c.room} · {c.action}
                <br />
                {resultText(r.results[id])}
              </p>
            ))}
            <h4>Votes</h4>
            {Object.entries(r.votes).map(([id, v]) => (
              <p key={id}>
                {game.players.find((p) => p.id === id)?.name} →{' '}
                {v === 'skip'
                  ? 'Skip'
                  : game.players.find((p) => p.id === v)?.name}
              </p>
            ))}
            <p>
              Coins remaining:{' '}
              {Object.entries(r.coins)
                .map(([room, n]) => `${room}: ${n}`)
                .join(' · ')}
            </p>
          </details>
        ))}
        {game.host === game.me.id ? (
          <GameButton disabled={disabled} onClick={() => void send('again')}>
            Play again
          </GameButton>
        ) : (
          <p>Waiting for the host to return everyone to the lobby.</p>
        )}
      </div>
    );
  else if (!game.me.active)
    content = (
      <div className="panel">
        <Eye className="hero-icon" />
        <h2>You watch from beyond the gates</h2>
        <p>
          You have been banished. Follow the discussion and verdicts while the
          remaining players decide the castle’s fate.
        </p>
        {game.phase === 'verdict' && <Verdict game={game} />}
      </div>
    );
  else if (game.phase === 'reveal')
    content = (
      <div
        className={`panel role-panel ${game.me.role === 'Dragon' ? 'dragon' : ''}`}
      >
        <span className="eyebrow">FOR YOUR EYES ONLY</span>
        {game.me.role === 'Dragon' ? (
          <Flame className="hero-icon" />
        ) : (
          <Shield className="hero-icon" />
        )}
        <h2>You are a {game.me.role}</h2>
        <p>
          {game.me.role === 'Dragon'
            ? 'Blend in. Steal every coin before the Wizards discover you.'
            : 'Protect the castle’s gold. Find and banish every hidden Dragon.'}
        </p>
        {game.me.allies.length > 0 && (
          <p>
            Your fellow Dragons: <strong>{game.me.allies.join(', ')}</strong>
          </p>
        )}
        {next('I know my mission')}
      </div>
    );
  else if (game.phase === 'selection')
    content = (
      <>
        <div className="section-heading">
          <h2>
            {game.me.choice
              ? 'All set.'
              : choosingAction
                ? 'What will you do?'
                : 'Where will you go?'}
          </h2>
          <span>
            <LockKeyhole size={15} /> Only you will know
          </span>
        </div>
        {game.me.choice ? (
          <div className="panel centered">
            <LockKeyhole className="hero-icon" />
            <h2>Your choice is sealed</h2>
            <p>
              {game.me.choice.room} · {game.me.choice.action}
            </p>
            <p>
              Waiting for the remaining adventurers. Their paths stay secret.
            </p>
            <div className="waiting-dots">
              {game.players
                .filter((p) => p.active)
                .map((p) => (
                  <span
                    key={p.id}
                    title={p.name}
                    className={p.submitted ? 'done' : ''}
                  >
                    {p.submitted ? <Check size={18} /> : p.name[0]}
                  </span>
                ))}
            </div>
          </div>
        ) : (
          <>
            {!choosingAction ? (
              <>
                <RadioGroup
                  value={room}
                  onValueChange={(v) => setRoom(String(v))}
                  className="room-grid"
                  aria-label="Choose a room"
                >
                  {game.settings.rooms.map((r, i) => {
                    const Icon = icons[i % 5];
                    return (
                      <label
                        key={r}
                        htmlFor={`room-${i}`}
                        className={`room-card ${room === r ? 'selected' : ''}`}
                      >
                        <div className={`room-art room-${i % 5}`}>
                          <img src="/castle.png" alt="" />
                          <Icon size={30} />
                        </div>
                        <div className="room-caption">
                          <span>{r}</span>
                          <RadioGroupItem id={`room-${i}`} value={r} />
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
                <Button
                  className="primary full topgap"
                  onClick={() => {
                    setChoosingAction(true);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                >
                  Continue with {room}
                </Button>
              </>
            ) : (
              <div className="panel action-panel">
                <Button
                  className="quiet full"
                  onClick={() => setChoosingAction(false)}
                >
                  ← Change room · {room}
                </Button>
                <RadioGroup
                  value={action}
                  onValueChange={(v) => setAction(String(v))}
                  className="actions"
                  aria-label="Choose a secret action"
                >
                  {ACTIONS.filter(
                    (a) => a !== 'Steal Coins' || game.me.role === 'Dragon',
                  ).map((a, i) => {
                    const Icon = [Coins, Shield, Search, Flame][i];
                    return (
                      <label
                        key={a}
                        htmlFor={`action-${i}`}
                        className={`action-option ${action === a ? 'selected' : ''}`}
                      >
                        <Icon />
                        <span>
                          <strong>{a}</strong>
                          <small>{descriptions[a]}</small>
                        </span>
                        <RadioGroupItem id={`action-${i}`} value={a} />
                      </label>
                    );
                  })}
                </RadioGroup>
                {action === 'Steal Coins' && bounds && (
                  <label>
                    Coins to steal
                    <input
                      type="number"
                      inputMode="numeric"
                      min={bounds.min}
                      max={bounds.max}
                      disabled={bounds.min === bounds.max || disabled}
                      value={amount}
                      onChange={(e) => setTheftAmount(Number(e.target.value))}
                    />
                  </label>
                )}
                <div className="row wrap">
                  <p className="muted">
                    You may change your mind until you seal your choice.
                  </p>
                  <GameButton
                    disabled={disabled}
                    onClick={() =>
                      void send('action', {
                        room,
                        action,
                        ...(action === 'Steal Coins' ? { amount } : {}),
                      })
                    }
                  >
                    Seal my choice
                  </GameButton>
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  else if (game.phase === 'results')
    content = (
      <div className="panel">
        <span className="eyebrow">
          A SECRET FROM {game.me.result?.room.toUpperCase() || 'THE CASTLE'}
        </span>
        <ScrollText className="hero-icon" />
        <h2>{game.me.result?.action || 'You stayed outside'}</h2>
        <p className="result-copy">{resultText(game.me.result)}</p>
        <p className="muted">
          Remember what you learned. What you tell the others is up to you.
        </p>
        {next('Join the discussion')}
      </div>
    );
  else if (game.phase === 'discussion')
    content = (
      <div className="panel">
        <span className="eyebrow">YOUR PUBLIC ACCOUNT</span>
        <h2>What’s your story?</h2>
        <p>
          Tell the truth. Bend it. Keep them guessing. Claims are never checked
          against your secret choice.
        </p>
        {truthfulChoice && !existingClaim && (
          <p className="truthful-draft">
            Your truthful account is filled in. You can post it as-is or change
            your story.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send('claim', {
              room,
              action,
              result: claimText,
              statement: '',
            }).then((v) => {
              if (v)
                setNotice(
                  'Your claim is posted. You may edit it until time runs out.',
                );
            });
          }}
        >
          <div className="settings-grid">
            <label>
              I entered
              <select value={room} onChange={(e) => setRoom(e.target.value)}>
                {game.settings.rooms.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              I chose
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {ACTIONS.slice(0, 3).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            What’s your account? <span className="muted">Optional</span>
            <textarea
              value={claimText}
              maxLength={640}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="The room still had 10 coins. Who else was in the Tower?"
            />
          </label>
          <Button type="submit" className="primary" disabled={disabled}>
            {game.claims[game.me.id] ? 'Update my claim' : 'Post my claim'}{' '}
            <ScrollText />
          </Button>
          {truthfulChoice && (
            <Button
              type="button"
              className="quiet truth-reset"
              disabled={disabled}
              onClick={() => {
                setRoom(truthfulChoice.room);
                setAction(truthfulChoice.action);
                setClaimText(truthfulResult);
              }}
            >
              Restore truthful account
            </Button>
          )}
          {notice && <p aria-live="polite">{notice}</p>}
        </form>
      </div>
    );
  else if (game.phase === 'vote')
    content = (
      <div className="panel">
        <span className="eyebrow">ONE VOICE. ONE SECRET VOTE.</span>
        <h2>Who should leave the castle?</h2>
        <p>
          A strict majority of all active players is needed. Skips and missed
          votes never lower the threshold.
        </p>
        {game.me.voted ? (
          <div className="centered">
            <Vote className="hero-icon" />
            <h3>Your vote is sealed</h3>
            <p>Waiting for the castle’s decision.</p>
          </div>
        ) : (
          <>
            <RadioGroup
              aria-label="Banishment vote"
              value={target}
              onValueChange={(v) => setTarget(String(v))}
            >
              {game.players
                .filter((p) => p.active)
                .map((p) => (
                  <label
                    key={p.id}
                    className={`action-option ${target === p.id ? 'selected' : ''}`}
                  >
                    <AvatarBadge player={p} />
                    <strong>
                      {p.name}
                      {p.id === game.me.id ? ' (you)' : ''}
                    </strong>
                    <RadioGroupItem id={`vote-${p.id}`} value={p.id} />
                  </label>
                ))}
              <label
                htmlFor="vote-skip"
                className={`action-option ${target === 'skip' ? 'selected' : ''}`}
              >
                <Shield />
                <strong>Skip this banishment</strong>
                <RadioGroupItem id="vote-skip" value="skip" />
              </label>
            </RadioGroup>
            <div className="topgap">
              <GameButton
                disabled={disabled}
                onClick={() => void send('vote', { target })}
              >
                Seal my vote
              </GameButton>
            </div>
          </>
        )}
      </div>
    );
  else
    content = (
      <div className="panel centered">
        <Vote className="hero-icon" />
        <span className="eyebrow">THE VOTES HAVE BEEN COUNTED</span>
        <Verdict game={game} />
        {next('Continue to the next round')}
      </div>
    );
  return (
    <>
      {content}
      {['discussion', 'vote', 'verdict'].includes(game.phase) && (
        <div className="claims-feed">
          <div className="section-heading">
            <h2>Whispers around the table</h2>
            <ScrollText />
          </div>
          {Object.keys(game.claims).length === 0 ? (
            <p className="empty">No claims yet. The room is listening.</p>
          ) : (
            Object.entries(game.claims).map(([id, c]) => (
              <article className="claim" key={id}>
                <div className="row">
                  <strong>{game.players.find((p) => p.id === id)?.name}</strong>
                  <span className="tag">PUBLIC CLAIM</span>
                </div>
                <p className="gold">
                  {c.room} · {c.action}
                </p>
                <p>{c.result}</p>
                {c.statement && <p>“{c.statement}”</p>}
              </article>
            ))
          )}
        </div>
      )}
    </>
  );
}
function Verdict({ game }: { game: View }) {
  return (
    <>
      <h2>
        {game.verdict?.banished
          ? `${game.players.find((p) => p.id === game.verdict?.banished)?.name} is banished`
          : 'No one is banished'}
      </h2>
      <p>
        {game.verdict?.banished
          ? 'The gates close behind them. Their story may not be what it seemed.'
          : 'The castle did not reach a strict majority. Everyone stays.'}
      </p>
      {game.settings.reveal && game.verdict?.banished && (
        <p>
          Revealed role:{' '}
          {game.players.find((p) => p.id === game.verdict?.banished)?.role}
        </p>
      )}
      <div className="vote-totals">
        {Object.entries(game.verdict?.totals || {}).map(([id, n]) => (
          <div key={id}>
            <span>
              {id === 'skip'
                ? 'Skip'
                : game.players.find((p) => p.id === id)?.name}
            </span>
            <b>
              {n} {n === 1 ? 'vote' : 'votes'}
            </b>
          </div>
        ))}
      </div>
    </>
  );
}
