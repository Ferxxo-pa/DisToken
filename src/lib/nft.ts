export interface NFT {
  tokenId: string;
  contractAddress: string;
  collectionName: string;
  name: string;
  description: string;
  imageUrl: string;
  metadata?: any;
}

export interface NFTCollection {
  owner: string;
  chain: 'ethereum' | 'solana';
  nfts: NFT[];
  totalCount: number;
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

  const nfts: NFT[] = (data.ownedNfts || []).map((nft: any) => ({
    tokenId: nft.tokenId || nft.id?.tokenId || 'unknown',
    contractAddress: nft.contract?.address || '',
    collectionName: nft.contract?.name || nft.title || 'Unknown Collection',
    name: nft.title || nft.name || `#${nft.tokenId}`,
    description: nft.description || nft.metadata?.description || '',
    imageUrl:
      nft.media?.[0]?.gateway ||
      nft.media?.[0]?.raw ||
      nft.metadata?.image ||
      nft.image?.originalUrl ||
      '',
    metadata: nft.metadata,
  }));

  return {
    owner: walletAddress,
    chain: 'ethereum',
    nfts: nfts.filter(n => n.imageUrl),
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
      return (
        iface.includes('NFT') ||
        iface === 'MplCoreAsset' ||
        iface === 'V1_NFT' ||
        iface === 'ProgrammableNFT'
      );
    })
    .map((asset: any) => {
      const content = asset.content ?? {};
      const meta = content.metadata ?? {};
      const files: any[] = content.files ?? [];

      // Best image: prefer cdn_uri, then uri from files, then json_uri
      const imageFile = files.find((f: any) =>
        f.mime?.startsWith('image/') || f.cdn_uri || f.uri
      );
      const imageUrl =
        imageFile?.cdn_uri ||
        imageFile?.uri ||
        content.links?.image ||
        '';

      const collectionGroup = (asset.grouping ?? []).find(
        (g: any) => g.group_key === 'collection'
      );

      return {
        tokenId: asset.id ?? 'unknown',
        contractAddress: collectionGroup?.group_value ?? asset.id ?? '',
        collectionName: meta.symbol || collectionGroup?.collection_metadata?.name || 'Unknown Collection',
        name: meta.name || asset.id || 'Unknown',
        description: meta.description || '',
        imageUrl,
        metadata: meta,
      };
    })
    .filter((n: NFT) => n.imageUrl);

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
