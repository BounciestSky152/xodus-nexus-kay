import { expect, it } from 'vitest';
import { gamePassTierRank, lowestGamePassTier, parseSubscription, subscriptionBadge } from './subscription';

const active = (productIds: string[]) => ({ status: 'active', productIds, checkedAt: new Date().toISOString() });
it('labels actual supported tiers, preferring Ultimate and PC access', () => {
  expect(subscriptionBadge(active(['CFQ7TTC0KGQ8']))).toBe('PC GAME PASS');
  expect(subscriptionBadge(active(['CFQ7TTC0K5DJ', 'CFQ7TTC0KGQ8', 'CFQ7TTC0KHS0']))).toBe('ULTIMATE');
  expect(subscriptionBadge(active(['CFQ7TTC0P85B']))).toBe('PREMIUM');
  expect(subscriptionBadge(active(['CFQ7TTC0K5DJ']))).toBe('ESSENTIAL');
});
it('never treats unknown, absent, stale, malformed or future records as active', () => {
  const pc = active(['CFQ7TTC0KGQ8']);
  for (const v of [undefined, {}, active(['invalid']), { ...pc, status: 'unknown' },
    { ...pc, checkedAt: 'bad' }, { ...pc, checkedAt: new Date(Date.now() - 86_400_001).toISOString() },
    { ...pc, checkedAt: new Date(Date.now() + 600_000).toISOString() }]) expect(subscriptionBadge(v)).toBeUndefined();
  expect(parseSubscription({ status: 'none', productIds: [], checkedAt: pc.checkedAt })?.status).toBe('none');
});
it('picks the cheapest PC plan that licenses a game, ignoring console-only and unknown plans', () => {
  expect(lowestGamePassTier(['CFQ7TTC0KHS0', 'CFQ7TTC0KGQ8', 'CFQ7TTC0P85B'])).toBe('premium');
  expect(lowestGamePassTier(['CFQ7TTC0KHS0', 'CFQ7TTC0KGQ8'])).toBe('pc');
  expect(lowestGamePassTier(['CFQ7TTC0K5DJ', 'CFQ7TTC0KHS0'])).toBe('essential');
  expect(lowestGamePassTier(['CFQ7TTC0KHS0'])).toBe('ultimate');
  for (const ids of [[], ['CFQ7TTC0K6L8'], ['CFQ7TTC10QFD', 'constructor']]) expect(lowestGamePassTier(ids)).toBeUndefined();
});
it('ranks owned games first, then plans by price, then unverified Game Pass and local games', () => {
  const ranks = [gamePassTierRank('owned', 'ultimate'), gamePassTierRank('gamepass', 'essential'), gamePassTierRank('gamepass', 'premium'),
    gamePassTierRank('gamepass', 'pc'), gamePassTierRank('gamepass', 'ultimate'), gamePassTierRank('gamepass'), gamePassTierRank(undefined)];
  expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  expect(new Set(ranks).size).toBe(ranks.length);
});
