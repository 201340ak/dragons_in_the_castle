'use client';
import { useEffect } from 'react';
import { defaults } from '@/lib/engine';
import type { Send } from '@/components/game/shared';
export function usePlatform(send: Send, inGame: boolean) {
  useEffect(() => {
    if ('serviceWorker' in navigator)
      void navigator.serviceWorker.register('/sw.js').catch(() => {});
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool || inGame) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'create_castle_demo',
          description:
            'Create a local game lobby with five simulated players. The visible app enters the created lobby.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 2, maxLength: 20 },
            },
            required: ['name'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input: unknown) => {
            const name = (input as { name?: unknown })?.name;
            if (
              typeof name !== 'string' ||
              name.trim().length < 2 ||
              name.length > 20
            )
              throw new Error('Enter a name of 2–20 characters.');
            const v = await send('create', {
              name,
              demo: true,
              settings: defaults,
            });
            if (!v) throw new Error('Could not create the demo.');
            return { code: v.code, phase: v.phase };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [send, inGame]);
}
