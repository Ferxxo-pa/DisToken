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
  nfts: NFT[];
  totalCount: number;
}

/**
 * Fetch NFTs from a wallet address using Alchemy API
 */
export async function fetchNFTsForWallet(walletAddress: string): Promise<NFTCollection> {
  const apiKey = import.meta.env.VITE_ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error("Alchemy API key not configured");
  }

  try {
    const url = `https://eth-mainnet.g.alchemy.com/nft/v2/${apiKey}/getNFTs`;
    const params = new URLSearchParams({
      owner: walletAddress,
      withMetadata: "true",
      excludeFilters: "SPAM",
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NFTs: ${response.statusText}`);
    }

    const data = await response.json();

    const nfts: NFT[] = (data.ownedNfts || []).map((nft: any) => ({
      tokenId: nft.tokenId || nft.id?.tokenId || "unknown",
      contractAddress: nft.contract?.address || "",
      collectionName: nft.contract?.name || nft.title || "Unknown Collection",
      name: nft.title || nft.name || `#${nft.tokenId}`,
      description: nft.description || nft.metadata?.description || "",
      imageUrl: 
        nft.media?.[0]?.gateway || 
        nft.media?.[0]?.raw || 
        nft.metadata?.image || 
        nft.image?.originalUrl ||
        "",
      metadata: nft.metadata,
    }));

    return {
      owner: walletAddress,
      nfts: nfts.filter(nft => nft.imageUrl), // Only include NFTs with images
      totalCount: nfts.length,
    };
  } catch (error) {
    console.error("[NFT] Error fetching NFTs:", error);
    throw new Error("Failed to fetch NFTs. Please check the wallet address and try again.");
  }
}
