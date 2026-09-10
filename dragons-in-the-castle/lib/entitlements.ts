export type DevAccount = {
  kind: 'free' | 'tokens' | 'subscriber';
  tokens: number;
};

export const DEV_ENTITLEMENTS_ENABLED =
  import.meta.env?.VITE_ENABLE_DEV_ENTITLEMENTS === 'true';

export function entitlementFeatures(account: DevAccount) {
  const paid = account.kind === 'subscriber' || account.tokens > 0;
  return {
    joinGames: true,
    botGames: true,
    hostGames: !DEV_ENTITLEMENTS_ENABLED || paid,
    customGameSettings: !DEV_ENTITLEMENTS_ENABLED || paid,
    unlimitedHosting:
      !DEV_ENTITLEMENTS_ENABLED || account.kind === 'subscriber',
  };
}

export const defaultDevAccount: DevAccount = { kind: 'free', tokens: 0 };
