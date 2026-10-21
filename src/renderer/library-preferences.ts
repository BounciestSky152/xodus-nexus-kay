import type { AccountLibraryPage } from '../shared/types';

export interface LibraryFilters {
  kind: AccountLibraryPage['kind'];
  playState: 'all' | 'installed' | 'installable';
  sort: 'installed-first' | 'pass-tier';
  query: string;
}
export const defaultLibraryFilters: LibraryFilters = { kind: 'all', playState: 'all', sort: 'installed-first', query: '' };
const key = 'xodus-nexus.library-filters.v1';
type Preferences = Pick<Storage, 'getItem' | 'setItem'>;

function normalize(value: unknown): LibraryFilters {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    kind: record.kind === 'owned' || record.kind === 'gamepass' ? record.kind : 'all',
    playState: record.playState === 'installed' || record.playState === 'installable' ? record.playState : 'all',
    sort: record.sort === 'pass-tier' ? record.sort : 'installed-first',
    // Search is session-only, including when loading older saved preferences.
    query: '',
  };
}

/** Electron's local storage is scoped to the launcher profile, not an account. */
export function loadLibraryFilters(storage?: Preferences): LibraryFilters {
  try { return normalize(JSON.parse((storage ?? window.localStorage).getItem(key) ?? 'null')); }
  catch { return { ...defaultLibraryFilters }; }
}

export function saveLibraryFilters(filters: LibraryFilters, storage?: Preferences): boolean {
  try {
    const { kind, playState, sort } = normalize(filters);
    (storage ?? window.localStorage).setItem(key, JSON.stringify({ kind, playState, sort }));
    return true;
  }
  catch { return false; }
}
