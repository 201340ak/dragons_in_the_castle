'use client';
/* oxlint-disable react/react-compiler -- This effect synchronizes external browser identity and network state after SSR. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from '@/lib/engine';
export function useGame() {
  const [game, setGame] = useState<View | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [restoring, setRestoring] = useState(true),
    [offline, setOffline] = useState(false),
    [now, setNow] = useState(0);
  const token = useRef(''),
    latest = useRef<View | null>(null),
    saved = useRef(''),
    mutating = useRef(false),
    sequence = useRef(0),
    accepted = useRef(0),
    offset = useRef(0);
  const accept = useCallback((v: View, n: number) => {
    if (n < accepted.current) return;
    accepted.current = n;
    offset.current = v.serverTime - Date.now();
    latest.current = v;
    setGame(v);
    setNow(v.serverTime);
    saved.current = v.code;
    localStorage.setItem('castle-code', v.code);
    setOffline(false);
  }, []);
  const request = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch(
      (import.meta.env?.VITE_API_BASE_URL || '') + '/api/game',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.current}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      },
    );
    const v = (await response.json()) as View & { error?: string };
    if (!response.ok)
      throw new Error(v.error || 'The castle could not be reached.');
    return v as View;
  }, []);
  const send = useCallback(
    async (type: string, extra: Record<string, unknown> = {}) => {
      if (mutating.current) return;
      mutating.current = true;
      setBusy(true);
      setError('');
      const n = ++sequence.current;
      try {
        const g = latest.current;
        const v = await request({
          type,
          code: g?.code,
          round: g?.round,
          phase: g?.phase,
          ...extra,
        });
        accept(v, n);
        navigator.vibrate?.(15);
        return v;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
      } finally {
        mutating.current = false;
        setBusy(false);
      }
    },
    [accept, request],
  );
  useEffect(() => {
    let alive = true,
      polling = false;
    try {
      token.current =
        localStorage.getItem('castle-guest') ||
        Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
          n.toString(16).padStart(2, '0'),
        ).join('');
      localStorage.setItem('castle-guest', token.current);
      saved.current = localStorage.getItem('castle-code') || '';
    } catch {
      setError('Enable browser storage to preserve your guest identity.');
    }
    const sync = async () => {
      if (!saved.current || mutating.current || polling) return;
      polling = true;
      const n = ++sequence.current;
      try {
        const v = await request({ type: 'sync', code: saved.current });
        if (alive && saved.current) accept(v, n);
      } catch {
        if (alive) setOffline(true);
      } finally {
        polling = false;
      }
    };
    if (saved.current) {
      setBusy(true);
      void sync().finally(() => {
        setBusy(false);
        setRestoring(false);
      });
    }
    if (!saved.current) setRestoring(false);
    const timer = setInterval(() => {
      setNow(Date.now() + offset.current);
      void sync();
    }, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [request, accept]);
  const leave = () => {
    saved.current = '';
    localStorage.removeItem('castle-code');
    latest.current = null;
    setGame(null);
    setError('');
    setOffline(false);
    accepted.current = ++sequence.current;
  };
  return { game, restoring, error, setError, busy, offline, now, send, leave };
}
