// ── Playlist Management ─────────────────────────────────────
// Playlists are named subsets of NFTs from a wallet, stored in localStorage.
// Shareable via URL params.

export interface Playlist {
  id: string;
  name: string;
  /** Array of tokenIds */
  items: string[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'distoken:playlists';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function loadPlaylists(wallet: string): Playlist[] {
  try {
    const key = `${STORAGE_KEY}:${wallet.toLowerCase()}`;
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}

export function savePlaylists(wallet: string, playlists: Playlist[]) {
  const key = `${STORAGE_KEY}:${wallet.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(playlists));
}

export function createPlaylist(wallet: string, name: string, items: string[] = []): Playlist {
  const playlists = loadPlaylists(wallet);
  const playlist: Playlist = {
    id: generateId(),
    name,
    items,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  playlists.push(playlist);
  savePlaylists(wallet, playlists);
  return playlist;
}

export function updatePlaylist(wallet: string, id: string, updates: Partial<Pick<Playlist, 'name' | 'items'>>): Playlist | null {
  const playlists = loadPlaylists(wallet);
  const idx = playlists.findIndex(p => p.id === id);
  if (idx === -1) return null;
  if (updates.name !== undefined) playlists[idx].name = updates.name;
  if (updates.items !== undefined) playlists[idx].items = updates.items;
  playlists[idx].updatedAt = Date.now();
  savePlaylists(wallet, playlists);
  return playlists[idx];
}

export function deletePlaylist(wallet: string, id: string) {
  const playlists = loadPlaylists(wallet).filter(p => p.id !== id);
  savePlaylists(wallet, playlists);
}

export function addToPlaylist(wallet: string, playlistId: string, tokenId: string): boolean {
  const playlists = loadPlaylists(wallet);
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return false;
  if (pl.items.includes(tokenId)) return false;
  pl.items.push(tokenId);
  pl.updatedAt = Date.now();
  savePlaylists(wallet, playlists);
  return true;
}

export function removeFromPlaylist(wallet: string, playlistId: string, tokenId: string): boolean {
  const playlists = loadPlaylists(wallet);
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return false;
  pl.items = pl.items.filter(id => id !== tokenId);
  pl.updatedAt = Date.now();
  savePlaylists(wallet, playlists);
  return true;
}

/** Encode a playlist into a URL-safe string for sharing */
export function encodePlaylistForUrl(playlist: Playlist): string {
  const data = { n: playlist.name, i: playlist.items };
  return btoa(JSON.stringify(data));
}

/** Decode a playlist from URL param */
export function decodePlaylistFromUrl(encoded: string): { name: string; items: string[] } | null {
  try {
    const data = JSON.parse(atob(encoded));
    if (data.n && Array.isArray(data.i)) return { name: data.n, items: data.i };
    return null;
  } catch {
    return null;
  }
}
