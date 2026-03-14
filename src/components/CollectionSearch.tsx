import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { searchCollectionByName, type CollectionSearchResult } from "@/lib/nft";
import { Search, Loader2 } from "lucide-react";

interface CollectionSearchProps {
  onSelect: (result: CollectionSearchResult) => void;
}

export function CollectionSearch({ onSelect }: CollectionSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollectionSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const hits = await searchCollectionByName(q);
      setResults(hits);
      setShowDropdown(hits.length > 0);
    } catch (e: any) {
      setError(e.message || "Search failed");
      setResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setShowDropdown(false);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
    if (e.key === "Escape") setShowDropdown(false);
  };

  const handleSelect = (result: CollectionSearchResult) => {
    setQuery(result.name);
    setShowDropdown(false);
    onSelect(result);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        <Input
          type="text"
          placeholder='Search by collection name (e.g. "Bored Ape Yacht Club")'
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          className="w-full h-14 pl-11 pr-11 text-sm bg-card border-border focus:border-foreground transition-colors"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive mt-2 text-center font-light">{error}</p>
      )}

      {/* Results Dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden">
          {results.map((r, i) => (
            <button
              key={r.address + i}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left group border-b border-border/20 last:border-0"
            >
              {/* Collection thumbnail */}
              {r.imageUrl ? (
                <img
                  src={r.imageUrl}
                  alt={r.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-accent"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-accent flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs font-medium">
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                  {r.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {r.address.slice(0, 6)}…{r.address.slice(-4)}
                  {r.totalSupply && (
                    <span className="ml-2 not-italic font-sans">
                      · {Number(r.totalSupply).toLocaleString()} items
                    </span>
                  )}
                </p>
              </div>
              <span className="text-xs text-muted-foreground/50 flex-shrink-0 font-light">
                Ethereum
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
