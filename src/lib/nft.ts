export type MediaType = 'image' | 'video' | 'audio' | 'html' | 'unknown';

// ── IPFS / Arweave Gateway Handling ──────────────────────────

const IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

const ARWEAVE_GATEWAY = 'https://arweave.net/';

/** Resolve IPFS/Arweave URIs to HTTP gateway URLs with fallback support */
export function resolveUri(uri: string): string {
  if (!uri) return uri;
  const trimmed = uri.trim();

  // ipfs:// protocol
  if (trimmed.startsWith('ipfs://')) {
    const cid = trimmed.replace('ipfs://', '');
    return IPFS_GATEWAYS[0] + cid;
  }

  // ar:// protocol (Arweave)
  if (trimmed.startsWith('ar://')) {
    return ARWEAVE_GATEWAY + trimmed.replace('ar://', '');
  }

  // Already HTTP(S), but might be a slow IPFS gateway — rewrite to faster one
  if (trimmed.includes('/ipfs/') && !trimmed.includes('nftstorage.link') && !trimmed.includes('cloudflare-ipfs')) {
    const cidPath = trimmed.split('/ipfs/').slice(1).join('/ipfs/');
    return IPFS_GATEWAYS[0] + cidPath;
  }

  return trimmed;
}

/** Try loading an image URL; if it fails, try IPFS gateway fallbacks */
export function resolveWithFallbacks(uri: string): string[] {
  if (!uri) return [];
  const primary = resolveUri(uri);
  const results = [primary];

  // If it's an IPFS URL, add fallback gateways
  if (uri.startsWith('ipfs://')) {
    const cid = uri.replace('ipfs://', '');
    IPFS_GATEWAYS.forEach(gw => {
      const url = gw + cid;
      if (url !== primary) results.push(url);
    });
  }

  return results;
}

/** Preload an image and return the first working URL */
export function preloadImage(urls: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let remaining = urls.length;
    if (remaining === 0) reject(new Error('No URLs'));

    // Try all in order, resolve with first success
    let resolved = false;
    urls.forEach((url, i) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!resolved) { resolved = true; resolve(url); }
      };
      img.onerror = () => {
        remaining--;
        // If this was the primary and we have more to try, wait
        if (remaining <= 0 && !resolved) reject(new Error('All URLs failed'));
      };
      // Stagger fallback attempts slightly
      setTimeout(() => { img.src = url; }, i * 200);
    });
  });
}

/** Detect pixel art by checking if original dimensions are very small */
export function isLikelyPixelArt(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  return (width <= 128 && height <= 128);
}

export interface NFT {
  tokenId: string;
  contractAddress: string;
  collectionName: string;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  mediaType: MediaType;
  metadata?: any;
  /** Original image dimensions if available (for pixel art detection) */
  originalWidth?: number;
  originalHeight?: number;
  /** Which chain this NFT is on */
  chain?: 'ethereum' | 'solana';
}

/** Detect media type from URL or mime string */
export function detectMediaType(url?: string, mime?: string): MediaType {
  if (!url && !mime) return 'image';
  const m = (mime || '').toLowerCase();
  const u = (url || '').toLowerCase().split('?')[0];
  if (m.startsWith('video/') || /\.(mp4|webm|ogv|mov)$/.test(u)) return 'video';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|flac)$/.test(u)) return 'audio';
  if (m === 'text/html' || m.includes('html') || /\.html?$/.test(u)) return 'html';
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/.test(u)) return 'image';
  // If animation_url exists but type unclear, assume video
  if (url && !mime) return 'video';
  return 'image';
}

export interface NFTCollection {
  owner: string;
  chain: 'ethereum' | 'solana';
  nfts: NFT[];
  totalCount: number;
}

/** Fetch NFTs from multiple wallets and merge into a single collection */
export async function fetchMultiWallet(addresses: string[]): Promise<NFTCollection> {
  const results = await Promise.allSettled(addresses.map(a => fetchNFTsForWallet(a)));
  const allNfts: NFT[] = [];
  let chain: 'ethereum' | 'solana' = 'ethereum';
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allNfts.push(...r.value.nfts);
      chain = r.value.chain; // Last successful chain wins (fine for display)
    }
  }
  return {
    owner: addresses.join(', '),
    chain,
    nfts: allNfts,
    totalCount: allNfts.length,
  };
}

// ── Chain Detection ──────────────────────────────────────────

export type Chain = 'ethereum' | 'solana' | 'unknown';

export function detectChain(address: string): Chain {
  const trimmed = address.trim();
  // Ethereum: 0x + 40 hex chars
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return 'ethereum';
  // ENS domain
  if (/^[a-zA-Z0-9-]+\.eth$/i.test(trimmed)) return 'ethereum';
  // Solana .sol domain (Bonfida SNS)
  if (/^[a-zA-Z0-9-]+\.sol$/i.test(trimmed)) return 'solana';
  // Solana: base58, 32–44 chars (no 0, O, I, l)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return 'solana';
  return 'unknown';
}

export function chainLabel(chain: Chain): string {
  if (chain === 'ethereum') return 'Ethereum';
  if (chain === 'solana') return 'Solana';
  return 'Unknown';
}

// ── Ethereum — Alchemy ───────────────────────────────────────

async function fetchEthereumNFTs(walletAddress: string): Promise<NFTCollection> {
  const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
  if (!apiKey) throw new Error('Alchemy API key not configured (VITE_ALCHEMY_API_KEY)');

  const url = `https://eth-mainnet.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
  const params = new URLSearchParams({
    owner: walletAddress,
    withMetadata: 'true',
    excludeFilters: 'SPAM',
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error(`Alchemy error: ${response.statusText}`);

  const data = await response.json();

  const nfts: NFT[] = (data.ownedNfts || []).map((nft: any) => {
    const rawAnimUrl: string =
      nft.metadata?.animation_url ||
      nft.media?.find((m: any) => m.format === 'mp4' || m.format === 'webm')?.gateway ||
      '';
    const rawImgUrl: string =
      nft.media?.[0]?.gateway ||
      nft.media?.[0]?.raw ||
      nft.metadata?.image ||
      nft.image?.originalUrl ||
      '';
    const mime: string = nft.media?.[0]?.format || '';
    const imgUrl = resolveUri(rawImgUrl);
    const animUrl = resolveUri(rawAnimUrl);
    // Extract dimensions if available (Alchemy sometimes provides these)
    const w = nft.media?.[0]?.resolution?.width;
    const h = nft.media?.[0]?.resolution?.height;
    return {
      tokenId: nft.tokenId || nft.id?.tokenId || 'unknown',
      contractAddress: nft.contract?.address || '',
      collectionName: nft.contract?.name || nft.title || 'Unknown Collection',
      name: nft.title || nft.name || `#${nft.tokenId}`,
      description: nft.description || nft.metadata?.description || '',
      imageUrl: imgUrl,
      animationUrl: animUrl || undefined,
      mediaType: detectMediaType(animUrl || imgUrl, mime),
      metadata: nft.metadata,
      originalWidth: w,
      originalHeight: h,
      chain: 'ethereum' as const,
    };
  });

  return {
    owner: walletAddress,
    chain: 'ethereum',
    nfts: nfts.filter(n => n.imageUrl || n.animationUrl),
    totalCount: nfts.length,
  };
}

// ── Solana — Helius DAS ──────────────────────────────────────

async function resolveSolDomain(domain: string): Promise<string> {
  // Bonfida SNS resolution via Helius helper endpoint
  const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
  if (!apiKey) throw new Error('Helius API key not configured (VITE_HELIUS_API_KEY)');

  const name = domain.replace(/\.sol$/i, '');
  const res = await fetch(
    `https://api.helius.xyz/v0/names?api-key=${apiKey}&name=${encodeURIComponent(name)}`
  );
  if (!res.ok) throw new Error(`Could not resolve .sol domain: ${domain}`);
  const data = await res.json();
  if (!data?.owner) throw new Error(`No wallet found for ${domain}`);
  return data.owner as string;
}

// ── Solana Spam Detection ────────────────────────────────────

const SCAM_NAME_KEYWORDS = [
  'claim', 'free mint', 'airdrop', 'voucher', 'rebate', 'congratulation',
  'winner', 'whitelist spot', 'free nft', 'free token', 'reward', 'bonus',
  'visit ', 'go to ', 'click here', 'staking reward', 'active staking',
  'coupon', 'jupreward', 'drop ', ' drop',
];

/** Patterns that indicate scam/spam even when creators are "verified" */
const SCAM_NAME_PATTERNS = [
  /\$\d+/,                          // "$19262 SOL For You", "$3000 WIF"
  /\d+\$\s?\w+/,                    // "3000$ WIF Drop"
  /🎁|💰|🎉.*#\d+/,                // "🎁 100 $TRUMP #2"
  /\d+\s?(sol|wif|trump|jup|bonk)\b/i, // Amount + token name combos
  /\.com|\.io|\.xyz|\.net|\.org/i,  // URLs in name
  /for you/i,                        // "$X For You"
  /open #\d+/i,                      // "JP Open #009" style airdrops
];

function isSolanaSpam(asset: any): boolean {
  if (asset.burnt) return true;

  const meta   = asset.content?.metadata ?? {};
  const name   = (meta.name        ?? '').toLowerCase();
  const desc   = (meta.description ?? '').toLowerCase();
  const text   = name + ' ' + desc;
  const rawName = meta.name ?? '';
  const creators: any[] = asset.creators ?? asset.content?.creators ?? [];

  // 1. URL in name or description
  if (/https?:\/\/|www\.|\.xyz|\.gg\/|t\.me\//.test(text)) return true;

  // 2. Common scam keywords
  if (SCAM_NAME_KEYWORDS.some(kw => name.includes(kw))) return true;

  // 3. Pattern-based detection (catches verified scams)
  if (SCAM_NAME_PATTERNS.some(p => p.test(rawName))) return true;

  // 4. Emoji spam in name (legitimate NFTs rarely lead with gift/money emojis)
  if (/^[🎁💰🎉💎🔥]/.test(rawName.trim())) return true;

  // 5. No verified creator AND no collection
  const hasVerifiedCreator = creators.some((c: any) => c.verified === true);
  const hasCollection = (asset.grouping ?? []).some((g: any) => g.group_key === 'collection');
  if (!hasVerifiedCreator && !hasCollection) return true;

  // 6. No image at all — likely a placeholder scam
  const files = asset.content?.files ?? [];
  const hasImage = files.some((f: any) => f.mime?.startsWith('image/') || f.cdn_uri || f.uri);
  const hasLink = asset.content?.links?.image;
  if (!hasImage && !hasLink) return true;

  return false;
}

async function fetchSolanaNFTs(walletAddress: string): Promise<NFTCollection> {
  const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
  if (!apiKey) throw new Error('Helius API key not configured (VITE_HELIUS_API_KEY)');

  // Resolve .sol domain if needed
  let owner = walletAddress;
  if (/\.sol$/i.test(walletAddress)) {
    owner = await resolveSolDomain(walletAddress);
  }

  // Paginate through all assets (DAS getAssetsByOwner)
  const allItems: any[] = [];
  let page = 1;
  const limit = 1000;

  while (true) {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `distoken-${page}`,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: owner,
          page,
          limit,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
          },
        },
      }),
    });

    if (!res.ok) throw new Error(`Helius error: ${res.statusText}`);
    const data = await res.json();

    if (data.error) throw new Error(`Helius RPC error: ${data.error.message}`);

    const items: any[] = data.result?.items ?? [];
    allItems.push(...items);

    // Stop when we've received fewer items than the page limit
    if (items.length < limit) break;
    page++;
  }

  const nfts: NFT[] = allItems
    .filter((asset: any) => {
      // Only include NFTs (interface = V1_NFT, ProgrammableNFT, V2_NFT, MplCoreAsset)
      const iface: string = asset.interface ?? '';
      if (!(iface.includes('NFT') || iface === 'MplCoreAsset' || iface === 'V1_NFT' || iface === 'ProgrammableNFT')) {
        return false;
      }
      // Spam / airdrop filter
      return !isSolanaSpam(asset);
    })
    .map((asset: any) => {
      const content = asset.content ?? {};
      const meta = content.metadata ?? {};
      const files: any[] = content.files ?? [];

      // Best image: prefer cdn_uri, then uri from files, then json_uri
      // Find video/animation file first, then image
      const videoFile = files.find((f: any) =>
        f.mime?.startsWith('video/') || /\.(mp4|webm|ogv)$/i.test(f.uri || '')
      );
      const imageFile = files.find((f: any) =>
        f.mime?.startsWith('image/') || f.cdn_uri || f.uri
      );
      const rawImageUrl =
        imageFile?.cdn_uri ||
        imageFile?.uri ||
        content.links?.image ||
        '';
      const rawAnimationUrl =
        videoFile?.cdn_uri ||
        videoFile?.uri ||
        meta.animation_url ||
        content.links?.animation_url ||
        '';
      const imageUrl = resolveUri(rawImageUrl);
      const animationUrl = resolveUri(rawAnimationUrl);

      const collectionGroup = (asset.grouping ?? []).find(
        (g: any) => g.group_key === 'collection'
      );

      // Helius sometimes provides image dimensions in content
      const imgDim = content.links?.image_dimensions;

      return {
        tokenId: asset.id ?? 'unknown',
        contractAddress: collectionGroup?.group_value ?? asset.id ?? '',
        collectionName: meta.symbol || collectionGroup?.collection_metadata?.name || 'Unknown Collection',
        name: meta.name || asset.id || 'Unknown',
        description: meta.description || '',
        imageUrl,
        animationUrl: animationUrl || undefined,
        mediaType: detectMediaType(animationUrl || imageUrl, videoFile?.mime || imageFile?.mime),
        metadata: meta,
        originalWidth: imgDim?.width,
        originalHeight: imgDim?.height,
        chain: 'solana' as const,
      };
    })
    .filter((n: NFT) => n.imageUrl || n.animationUrl);

  return {
    owner,
    chain: 'solana',
    nfts,
    totalCount: nfts.length,
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Auto-detects chain from address format and fetches NFTs accordingly.
 * ETH: 0x address or .eth ENS
 * Solana: base58 address or .sol domain
 */
export async function fetchNFTsForWallet(walletAddress: string): Promise<NFTCollection> {
  const chain = detectChain(walletAddress.trim());

  if (chain === 'ethereum') {
    return fetchEthereumNFTs(walletAddress.trim());
  }

  if (chain === 'solana') {
    return fetchSolanaNFTs(walletAddress.trim());
  }

  throw new Error(
    'Invalid address. Enter an Ethereum address (0x...), ENS name (.eth), Solana address, or .sol domain.'
  );
}
