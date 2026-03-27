import { fetchFloorPrice } from "@/lib/nft";
import { FEATURED_COLLECTIONS, type FeaturedCollection } from "@/lib/featuredCollections";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

function CollectionCard({ collection }: { collection: FeaturedCollection }) {
  const [, navigate] = useLocation();
  const [floorPrice, setFloorPrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFloorPrice(collection.contract).then((result) => {
      if (!cancelled) {
        setFloorPrice(typeof result?.eth === "number" ? result.eth : null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [collection.contract]);

  return (
    <div
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition rounded-xl p-6 cursor-pointer min-h-[250px] flex flex-col"
      onClick={() => navigate(`/collection/${collection.slug}`)}
    >
      <div className="text-4xl mb-3">{collection.emoji}</div>
      <h2 className="text-white font-bold text-lg">{collection.name}</h2>
      <p className="text-zinc-400 text-sm mt-1">{collection.description}</p>
      <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full inline-block mt-2 self-start">
        {collection.chain}
      </span>
      {floorPrice !== null && (
        <p className="text-green-400 text-sm mt-4 font-mono">Ξ {floorPrice.toFixed(3)}</p>
      )}
      <button
        className="mt-auto pt-6 text-zinc-300 hover:text-white text-sm underline text-left"
        onClick={(event) => {
          event.stopPropagation();
          navigate(`/collection/${collection.slug}`);
        }}
      >
        Browse collection →
      </button>
    </div>
  );
}

export default function Collections() {
  const [, navigate] = useLocation();

  return (
    <div className="bg-black min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto">
        <button
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-8"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>DisToken</span>
        </button>

        <div className="mb-10">
          <p className="text-white text-2xl md:text-4xl font-mono uppercase tracking-[0.2em]">
            Explore Collections
          </p>
          <p className="text-zinc-500 text-sm mt-3">
            {FEATURED_COLLECTIONS.length} curated collections
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {FEATURED_COLLECTIONS.map((collection) => (
            <CollectionCard key={collection.slug} collection={collection} />
          ))}
        </div>
      </div>
    </div>
  );
}
