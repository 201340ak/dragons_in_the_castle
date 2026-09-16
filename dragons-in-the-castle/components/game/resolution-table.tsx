'use client';
/* oxlint-disable react/react-compiler -- Timed presentation synchronizes the browser clock and motion preference. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Coins, Shield, ShieldCheck, Search, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { View } from '@/lib/engine';
import {
  coinTokens,
  createResolutionTimeline,
  resolutionEffect,
  resolutionStage,
  RESOLUTION_DURATION,
  RESOLUTION_IMPACT,
  type ResolutionCue,
  type ResolutionEffect,
} from '@/lib/resolution';
import { CastleBoard, RoundTrack } from './castle-board';
import { GameButton, resultText, type Send } from './shared';

// Future audio can subscribe to these cues without changing game rules or
// animation timing. No sound assets, autoplay, or audio contexts are created.
export type ResolutionFeedback = {
  cue: ResolutionCue;
  effect: ResolutionEffect;
};
export function ResolutionTable({
  game,
  send,
  disabled,
  startedAt,
  concealed = false,
  onCue,
}: {
  game: View;
  send: Send;
  disabled: boolean;
  startedAt: number | null;
  concealed?: boolean;
  onCue?: (event: ResolutionFeedback) => void;
}) {
  const result = game.me.result;
  const effect = resolutionEffect(result);
  const [timeline] = useState(() => createResolutionTimeline(startedAt));
  const [stage, setStage] = useState<ResolutionCue>(() =>
    resolutionStage(startedAt, Date.now()),
  );
  const delivered = useRef(new Set<ResolutionCue>());
  const callback = useRef(onCue);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    callback.current = onCue;
  }, [onCue]);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      setStage(timeline.advance(Date.now(), concealed || motion.matches));
    update();
    const impact = window.setTimeout(
      update,
      Math.max(0, (startedAt ?? 0) + RESOLUTION_IMPACT - Date.now()),
    );
    const done = window.setTimeout(
      update,
      Math.max(0, (startedAt ?? 0) + RESOLUTION_DURATION - Date.now()),
    );
    const reduce = () => {
      if (motion.matches) setStage(timeline.advance(Date.now(), true));
    };
    motion.addEventListener('change', reduce);
    return () => {
      clearTimeout(impact);
      clearTimeout(done);
      motion.removeEventListener('change', reduce);
    };
  }, [startedAt, concealed, timeline]);
  useEffect(() => {
    if (startedAt === null || concealed || delivered.current.has(stage)) return;
    delivered.current.add(stage);
    callback.current?.({ cue: stage, effect });
  }, [stage, effect, startedAt, concealed]);
  const settled = stage === 'settled';
  const Icon =
    effect === 'blocked'
      ? ShieldCheck
      : effect === 'guard'
        ? Shield
        : effect === 'investigate'
          ? Search
          : effect === 'missed'
            ? LockKeyhole
            : Coins;
  const labels: Record<ResolutionEffect, string> = {
    theft: `${result?.stolen ?? 0} coins stolen`,
    blocked: 'Theft blocked',
    guard: 'Room guarded',
    count: `${result?.coins ?? '?'} coins remain`,
    investigate: 'Traces discovered',
    empty: 'No coins taken',
    missed: 'You stayed outside',
  };
  const skip = () => {
    setStage(timeline.advance(Date.now(), true));
    delivered.current.add('begin');
    delivered.current.add('impact');
    resultHeading.current?.focus();
  };
  return (
    <section
      className={`resolution-table resolution-${effect} stage-${stage}`}
      aria-label="Private round resolution"
    >
      <RoundTrack
        round={game.round}
        role={game.me.role}
        sealed={false}
        resolving
      />
      <div className="resolution-status">
        <span>
          {settled
            ? 'Your result'
            : stage === 'begin'
              ? 'Your card turns…'
              : 'The castle resolves…'}
        </span>
        {!settled && (
          <Button className="quiet" onClick={skip}>
            Skip animation
          </Button>
        )}
      </div>
      <CastleBoard
        rooms={game.settings.rooms}
        selected={result?.room || ''}
        onSelect={() => {}}
        player={game.players.find((player) => player.id === game.me.id)!}
        disabled
        resultMode
        roomEffect={
          <div className="room-resolution-effect" aria-hidden="true">
            {effect === 'theft' && !settled ? (
              <div className="stolen-tokens">
                {coinTokens(result?.stolen ?? 0).map((value, index) => (
                  <span
                    className="coin-token"
                    key={index}
                    style={{ '--token-index': index } as CSSProperties}
                  >
                    <Coins size={18} />
                    {value > 1 && <b>{value}</b>}
                  </span>
                ))}
              </div>
            ) : (
              <Icon size={30} />
            )}
            <span>{stage === 'begin' ? 'Sealed' : labels[effect]}</span>
          </div>
        }
      />
      <div className="panel resolution-account">
        <span className="eyebrow">FOR YOUR EYES ONLY</span>
        <h2 ref={resultHeading} tabIndex={-1}>
          {result?.action || 'You stayed outside'}
        </h2>
        <p className="result-copy">{resultText(result)}</p>
        {result?.groups && (
          <dl className="resolution-clues">
            {Object.entries(result.groups).map(([label, count]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
        )}
        <GameButton
          disabled={disabled || game.ack}
          onClick={() => {
            setStage(timeline.advance(Date.now(), true));
            void send('ack');
          }}
        >
          {game.ack ? 'Waiting for the fellowship…' : 'Join the discussion'}
        </GameButton>
      </div>
    </section>
  );
}
