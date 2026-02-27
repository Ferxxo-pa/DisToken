import type { NFT } from './nft';

export type AutoGroupKey =
  | 'chain:ethereum'
  | 'chain:solana'
  | 'media:image'
  | 'media:video'
  | 'media:audio'
  | 'media:generative'
  | `creator:${string}`;

export interface AutoGroup {
  key: AutoGroupKey;
  label: string;
  count: number;
  icon: string;
}

/** Derive smart auto-collection groups from an NFT list */
export function getAutoGroups(nfts: NFT[], chain?: 'ethereum' | 'solana'): AutoGroup[] {
  const groups: AutoGroup[] = [];

  // Chain groups — only useful when chain is ambiguous (multi-wallet)
  // We rely on contractAddress prefix or the passed chain
  const ethCount = chain === 'ethereum' ? nfts.length :
    nfts.filter(n => n.contractAddress.startsWith('0x')).length;
  const solCount = chain === 'solana' ? nfts.length :
    nfts.filter(n => !n.contractAddress.startsWith('0x')).length;

  if (ethCount > 0 && solCount > 0) {
    groups.push({ key: 'chain:ethereum', label: 'Ethereum', count: ethCount, icon: 'Ξ' });
    groups.push({ key: 'chain:solana', label: 'Solana', count: solCount, icon: '◎' });
  }

  // Media type groups
  const imgCount = nfts.filter(n => n.mediaType === 'image').length;
  const vidCount = nfts.filter(n => n.mediaType === 'video').length;
  const audCount = nfts.filter(n => n.mediaType === 'audio').length;
  const htmlCount = nfts.filter(n => n.mediaType === 'html').length;

  if (vidCount > 0) groups.push({ key: 'media:video', label: 'Videos', count: vidCount, icon: '▶' });
  if (audCount > 0) groups.push({ key: 'media:audio', label: 'Audio', count: audCount, icon: '♪' });
  if (htmlCount > 0) groups.push({ key: 'media:generative', label: 'Generative', count: htmlCount, icon: '⟨/⟩' });
  if (imgCount > 0 && (vidCount > 0 || audCount > 0 || htmlCount > 0)) {
    groups.push({ key: 'media:image', label: 'Images', count: imgCount, icon: '🖼' });
  }

  // Top creator/artist groups (from metadata.creators or metadata.artist)
  const creatorCounts = new Map<string, number>();
  for (const nft of nfts) {
    const meta = nft.metadata;
    if (!meta) continue;
    // Solana: creators array
    const creators: any[] = meta.creators || [];
    if (Array.isArray(creators) && creators.length > 0) {
      const topCreator = creators.find((c: any) => c.verified) || creators[0];
      if (topCreator?.address) {
        const addr = topCreator.address as string;
        creatorCounts.set(addr, (creatorCounts.get(addr) || 0) + 1);
      }
    }
    // ETH: from metadata.artist or metadata.created_by
    const artist: string = meta.artist || meta.created_by || '';
    if (artist) {
      creatorCounts.set(artist, (creatorCounts.get(artist) || 0) + 1);
    }
  }

  // Only show creator groups with 2+ NFTs and at most top 5
  const topCreators = [...creatorCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [addr, count] of topCreators) {
    const label = addr.length > 20
      ? addr.slice(0, 6) + '…' + addr.slice(-4)
      : addr;
    groups.push({
      key: `creator:${addr}` as AutoGroupKey,
      label: `Creator: ${label}`,
      count,
      icon: '🎨',
    });
  }

  return groups;
}

/** Filter NFTs by an AutoGroupKey */
export function filterByAutoGroup(nfts: NFT[], key: AutoGroupKey): NFT[] {
  if (key === 'chain:ethereum') return nfts.filter(n => n.contractAddress.startsWith('0x'));
  if (key === 'chain:solana') return nfts.filter(n => !n.contractAddress.startsWith('0x'));
  if (key === 'media:image') return nfts.filter(n => n.mediaType === 'image');
  if (key === 'media:video') return nfts.filter(n => n.mediaType === 'video');
  if (key === 'media:audio') return nfts.filter(n => n.mediaType === 'audio');
  if (key === 'media:generative') return nfts.filter(n => n.mediaType === 'html');
  if (key.startsWith('creator:')) {
    const addr = key.slice('creator:'.length);
    return nfts.filter(n => {
      const meta = n.metadata;
      if (!meta) return false;
      const creators: any[] = meta.creators || [];
      if (creators.some((c: any) => c.address === addr)) return true;
      return meta.artist === addr || meta.created_by === addr;
    });
  }
  return nfts;
}
