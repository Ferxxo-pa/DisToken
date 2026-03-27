import { NFTSlideshow } from "@/components/NFTSlideshow";
import { FEATURED_COLLECTIONS } from "@/lib/featuredCollections";
import { fetchNFTsForCollection, type NFTCollection } from "@/lib/nft";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface CollectionViewProps {
  params: { slug: string };
}

export default function CollectionView({ params }: CollectionViewProps) {
  const [, navigate] = useLocation();
  const collection = FEATURED_COLLECTIONS.find((item) => item.slug === params.slug);
  const [data, setData] = useState<NFTCollection | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(collection));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collection) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchNFTsForCollection(collection.contract)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load collection");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [collection]);

  if (!collection) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-2xl font-mono uppercase">Collection not found</p>
          <button
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            onClick={() => navigate("/collections")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to collections
          </button>
        </div>
      </div>
    );
  }

  const loadCollection = () => {
    setIsLoading(true);
    setError(null);
    fetchNFTsForCollection(collection.contract)
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load collection");
        setIsLoading(false);
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p className="text-zinc-300">Loading {collection.name}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-lg text-zinc-200">{error}</p>
          <button
            className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition"
            onClick={loadCollection}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-zinc-900 px-4 py-5 md:px-8">
        <div className="max-w-6xl mx-auto">
          <button
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-6"
            onClick={() => navigate("/collections")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to collections
          </button>
          <div className="flex items-start gap-4">
            <div className="text-4xl">{collection.emoji}</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{collection.name}</h1>
              <p className="text-zinc-400 mt-2 max-w-2xl">{collection.description}</p>
            </div>
          </div>
        </div>
      </div>

      {data && (
        <NFTSlideshow
          nfts={data.nfts}
          walletAddress={collection.contract}
          chain={data.chain}
          onChangeWallet={() => navigate("/collections")}
        />
      )}
    </div>
  );
}
