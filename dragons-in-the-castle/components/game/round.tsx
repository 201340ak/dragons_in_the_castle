'use client';
import { ResolutionTable } from './resolution-table';
import { SelectionTable } from './selection-table';
import { VotePanel } from './vote-panel';
import { useState } from 'react';
import { Shield, Flame, ScrollText, Vote, Eye, Trophy } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ACTIONS, REACTIONS, type View } from '@/lib/engine';
import { AvatarBadge, GameButton, Gold, resultText, type Send } from './shared';
export function Round({
  game,
  send,
  disabled,
  resolutionStartedAt = null,
  concealed = false,
}: {
  game: View;
  send: Send;
  disabled: boolean;
  resolutionStartedAt?: number | null;
  concealed?: boolean;
}) {
  const existingClaim = game.claims[game.me.id];
  const truthfulChoice = game.me.role === 'Wizard' ? game.me.choice : undefined;
  const truthfulResult =
    game.me.role === 'Wizard' && game.me.result
      ? resultText(game.me.result)
      : '';
  const [room, setRoom] = useState(
      existingClaim?.room || truthfulChoice?.room || game.settings.rooms[0],
    ),
    [action, setAction] = useState(
      existingClaim?.action || truthfulChoice?.action || 'Count Coins',
    ),
    [claimText, setClaimText] = useState(
      existingClaim
        ? [existingClaim.result, existingClaim.statement]
            .filter(Boolean)
            .join('\n\n')
        : truthfulResult,
    ),
    [notice, setNotice] = useState('');
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
  else if (!game.me.active && game.phase !== 'vote')
    content = (
      <div className="panel">
        <Eye className="hero-icon" />
        <h2>You watch from beyond the gates</h2>
        <p>
          You have been banished. Follow the Round table and verdicts while the
          remaining players decide the castle’s fate.
        </p>
        {game.phase === 'verdict' && <Verdict game={game} />}
        {game.phase === 'discussion' && <Claims game={game} />}
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
    content = <SelectionTable game={game} send={send} disabled={disabled} />;
  else if (game.phase === 'results')
    content = (
      <ResolutionTable
        game={game}
        send={send}
        disabled={disabled}
        startedAt={resolutionStartedAt}
        concealed={concealed}
      />
    );
  else if (game.phase === 'discussion')
    content = (
      <Tabs defaultValue="claim" className="discussion-tabs">
        <TabsList aria-label="Round table pages">
          <TabsTrigger value="table">
            Round table ({Object.keys(game.claims).length})
          </TabsTrigger>
          <TabsTrigger value="claim">My claim</TabsTrigger>
        </TabsList>
        <div className="discussion-ready">
          <p>
            {game.players.filter((p) => p.discussionReady).length} of{' '}
            {game.players.filter((p) => p.active).length} ready to vote
          </p>
          <Button
            className="secondary full"
            disabled={disabled || !existingClaim}
            onClick={() => void send('discussion-ready', { ready: !game.ack })}
          >
            {game.ack ? 'Keep discussing' : 'Ready to vote'}
          </Button>
          {!existingClaim && (
            <p className="tiny">Post your claim to get ready.</p>
          )}
        </div>
        <TabsContent value="table">
          <Claims game={game} send={send} disabled={disabled} />
        </TabsContent>
        <TabsContent value="claim">
          <div className="panel">
            <span className="eyebrow">YOUR PUBLIC ACCOUNT</span>
            <h2>What’s your story?</h2>
            <p>
              Tell the truth. Bend it. Keep them guessing. Claims are never
              checked against your secret choice.
            </p>
            {truthfulChoice && !existingClaim && (
              <p className="truthful-draft">
                Your truthful account is filled in. You can post it as-is or
                change your story.
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
                      'Your claim is posted. You may edit it until voting starts.',
                    );
                });
              }}
            >
              <div className="settings-grid">
                <label>
                  I entered
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  >
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
        </TabsContent>
      </Tabs>
    );
  else if (game.phase === 'vote')
    content = <VotePanel game={game} send={send} disabled={disabled} />;
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
      {game.phase === 'discussion' && game.settings.roundTableUntimed && (
        <RoundTableTiming game={game} send={send} disabled={disabled} />
      )}
      {['vote', 'verdict'].includes(game.phase) && <Claims game={game} />}
    </>
  );
}
function RoundTableTiming({
  game,
  send,
  disabled,
}: {
  game: View;
  send: Send;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const waiting = game.players.filter((p) => p.active && !p.discussionReady);
  const canAdvance =
    game.me.id === game.host && game.settings.roundTableHostAdvance;
  return (
    <section className="round-table-timing" aria-label="Round table timing">
      <p>
        No timer. Voting starts when every active player has posted a claim and
        marked ready.
      </p>
      {waiting.length > 0 && (
        <p className="tiny">
          Waiting for:{' '}
          {waiting
            .map((p) => `${p.name}${!p.online && !p.bot ? ' (offline)' : ''}`)
            .join(', ')}
          .
        </p>
      )}
      {game.settings.roundTableHostAdvance && !canAdvance && (
        <p className="tiny">The host can also start voting early.</p>
      )}
      {canAdvance &&
        (confirming ? (
          <div>
            <p>
              Start voting now? Players who are not ready will lose the chance
              to edit claims or react.
            </p>
            <Button
              className="primary full"
              disabled={disabled}
              onClick={() => void send('round-table-advance')}
            >
              Yes, start voting
            </Button>
            <Button
              className="quiet full"
              disabled={disabled}
              onClick={() => setConfirming(false)}
            >
              Keep the Round table open
            </Button>
          </div>
        ) : (
          <Button
            className="secondary full"
            disabled={disabled}
            onClick={() => setConfirming(true)}
          >
            Start voting early
          </Button>
        ))}
    </section>
  );
}
function Claims({
  game,
  send,
  disabled = false,
}: {
  game: View;
  send?: Send;
  disabled?: boolean;
}) {
  return (
    <div className="claims-feed">
      <div className="section-heading">
        <h2>Whispers around the table</h2>
        <ScrollText />
      </div>
      <p className="tiny">
        React to a claim. Counts are anonymous; tap your reaction again to
        remove it. Editing a claim clears its reactions.
      </p>
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
            <div
              className="claim-reactions"
              aria-label={`Reactions to ${game.players.find((p) => p.id === id)?.name}’s claim`}
            >
              {REACTIONS.map((reaction) => {
                const summary = game.claimReactions?.[id];
                const count = summary?.counts[reaction.id] ?? 0;
                const selected = summary?.mine === reaction.id;
                const interactive =
                  !!send &&
                  game.me.active &&
                  id !== game.me.id &&
                  game.phase === 'discussion';
                return interactive ? (
                  <Button
                    key={reaction.id}
                    className="quiet reaction-button"
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-label={`${reaction.label}: ${count}${selected ? ', your reaction' : ''}`}
                    onClick={() =>
                      void send('claim-reaction', {
                        target: id,
                        reaction: selected ? null : reaction.id,
                        claimVersion: summary?.version ?? 0,
                      })
                    }
                  >
                    <span aria-hidden="true">{reaction.emoji}</span>
                    <span>{count}</span>
                  </Button>
                ) : (
                  <span
                    key={reaction.id}
                    className="reaction-count"
                    aria-label={`${reaction.label}: ${count}`}
                  >
                    <span aria-hidden="true">
                      {reaction.emoji} {count}
                    </span>
                  </span>
                );
              })}
            </div>
          </article>
        ))
      )}
    </div>
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
