export const ACCOUNT_AVATARS = [
  '🧙',
  '🛡️',
  '🏹',
  '🗝️',
  '📜',
  '🦉',
  '⚔️',
  '🧭',
] as const;
export type Account = {
  id: string;
  email: string;
  name: string;
  avatar: string;
};
