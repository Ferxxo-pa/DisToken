// ── Visitor Analytics — localStorage-based, no backend ──────

const NS = 'distoken:analytics';

export interface NFTDwell {
  tokenId: string;
  name: string;
  imageUrl: string;
  totalMs: number;
  views: number;
}

export interface AnalyticsData {
  totalViews: number;
  sessionCount: number;
  visitorId: string;
  isUniqueVisitor: boolean;
  topNFTs: NFTDwell[];
  firstSeen: number; // unix ms
  lastSeen: number;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
  } catch {}
}

// ── Visitor fingerprint via canvas hash ──────────────────────
function generateVisitorId(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'anon-' + Math.random().toString(36).slice(2);
    ctx.textBaseline = 'alphabetic';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f00';
    ctx.fillText('DisToken🎨', 2, 15);
    ctx.fillStyle = 'rgba(0,0,255,0.5)';
    ctx.fillText('Fingerprint', 4, 17);
    const hash = canvas.toDataURL().split('').reduce((acc, c) => {
      acc = (acc << 5) - acc + c.charCodeAt(0);
      return acc & acc;
    }, 0);
    return 'v-' + Math.abs(hash).toString(36);
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2);
  }
}

// ── Session tracking ─────────────────────────────────────────
const SESSION_KEY = `${NS}:session-active`;

function initSession() {
  const alreadyActive = sessionStorage.getItem(SESSION_KEY);
  if (!alreadyActive) {
    sessionStorage.setItem(SESSION_KEY, '1');
    const count = load<number>('session-count', 0);
    save('session-count', count + 1);
  }
}

// ── Public API ───────────────────────────────────────────────

export function initAnalytics(): string {
  initSession();

  let visitorId = load<string>('visitor-id', '');
  if (!visitorId) {
    visitorId = generateVisitorId();
    save('visitor-id', visitorId);
    save('first-seen', Date.now());
    save('is-new-visitor', true);
  } else {
    save('is-new-visitor', false);
  }

  // Increment total views on each page load (new session)
  const alreadyCounted = sessionStorage.getItem(`${NS}:views-counted`);
  if (!alreadyCounted) {
    sessionStorage.setItem(`${NS}:views-counted`, '1');
    const tv = load<number>('total-views', 0);
    save('total-views', tv + 1);
  }

  save('last-seen', Date.now());
  return visitorId;
}

/** Record dwell time for an NFT */
export function recordDwell(tokenId: string, name: string, imageUrl: string, ms: number) {
  if (ms < 500) return; // Ignore flashes
  const dwells = load<NFTDwell[]>('nft-dwells', []);
  const existing = dwells.find(d => d.tokenId === tokenId);
  if (existing) {
    existing.totalMs += ms;
    existing.views += 1;
  } else {
    dwells.push({ tokenId, name, imageUrl, totalMs: ms, views: 1 });
  }
  save('nft-dwells', dwells);
}

export function getAnalytics(): AnalyticsData {
  const visitorId = load<string>('visitor-id', 'unknown');
  const dwells = load<NFTDwell[]>('nft-dwells', []);
  const topNFTs = [...dwells].sort((a, b) => b.totalMs - a.totalMs).slice(0, 10);

  return {
    totalViews: load<number>('total-views', 0),
    sessionCount: load<number>('session-count', 0),
    visitorId,
    isUniqueVisitor: load<boolean>('is-new-visitor', false),
    topNFTs,
    firstSeen: load<number>('first-seen', Date.now()),
    lastSeen: load<number>('last-seen', Date.now()),
  };
}

export function clearAnalytics() {
  const keys = ['total-views', 'session-count', 'visitor-id', 'is-new-visitor', 'first-seen', 'last-seen', 'nft-dwells'];
  keys.forEach(k => localStorage.removeItem(`${NS}:${k}`));
}
