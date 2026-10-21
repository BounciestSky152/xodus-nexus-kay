import type { GamePassSubscription, GamePassTier } from './types.js';

const labels: Record<string, string> = {
  CFQ7TTC0KHS0: 'ULTIMATE', CFQ7TTC0KGQ8: 'PC GAME PASS',
  CFQ7TTC0P85B: 'PREMIUM', CFQ7TTC0K5DJ: 'ESSENTIAL', CFQ7TTC0K6L8: 'GAME PASS CONSOLE',
};
// Game Pass Console is omitted because it never licenses PC packages.
const pcTiers: Record<string, GamePassTier> = {
  CFQ7TTC0K5DJ: 'essential', CFQ7TTC0P85B: 'premium', CFQ7TTC0KGQ8: 'pc', CFQ7TTC0KHS0: 'ultimate',
};
/** From the cheapest plan to the most inclusive one. */
export const gamePassTiers: readonly GamePassTier[] = ['essential', 'premium', 'pc', 'ultimate'];
export const gamePassTierLabels: Record<GamePassTier, string> = {
  essential: 'Game Pass Essential', premium: 'Game Pass Premium', pc: 'PC Game Pass', ultimate: 'Game Pass Ultimate',
};

export function parseSubscription(value: unknown, now = Date.now()): GamePassSubscription | undefined {
  if (!value || typeof value !== 'object') return;
  const data = value as Partial<GamePassSubscription>;
  if (!['active', 'none', 'unknown'].includes(data.status ?? '') || typeof data.checkedAt !== 'string'
    || !Array.isArray(data.productIds) || data.productIds.length > 5
    || !data.productIds.every(id => typeof id === 'string' && Object.hasOwn(labels, id))) return;
  const age = now - Date.parse(data.checkedAt);
  if (!Number.isFinite(age) || age < -300_000 || age >= 86_400_000) return;
  if ((data.status === 'active') !== (data.productIds.length > 0)) return;
  return { status: data.status as GamePassSubscription['status'], productIds: [...new Set(data.productIds)], checkedAt: data.checkedAt };
}

export function subscriptionBadge(value: unknown): string | undefined {
  const subscription = parseSubscription(value);
  if (subscription?.status !== 'active') return;
  return Object.keys(labels).filter(id => subscription.productIds.includes(id)).map(id => labels[id])[0];
}

/** The cheapest known plan among the subscription IDs that satisfy a Store license. */
export function lowestGamePassTier(planIds: Iterable<string>): GamePassTier | undefined {
  const tiers = new Set([...planIds].flatMap(id => Object.hasOwn(pcTiers, id) ? pcTiers[id] : []));
  return gamePassTiers.find(tier => tiers.has(tier));
}

/** Owned games need no plan. Unverified Game Pass access and local imports sort last. */
export function gamePassTierRank(access: 'owned' | 'gamepass' | undefined, tier?: GamePassTier): number {
  if (access === 'owned') return 0;
  if (tier) return 1 + gamePassTiers.indexOf(tier);
  return gamePassTiers.length + (access === 'gamepass' ? 1 : 2);
}
