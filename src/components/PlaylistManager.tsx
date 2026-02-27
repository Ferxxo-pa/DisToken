import { Button } from "@/components/ui/button";
import type { NFT } from "@/lib/nft";
import {
  type Playlist,
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  loadPlaylists,
  updatePlaylist,
} from "@/lib/playlists";
import { AnimatePresence, motion } from "framer-motion";
import { Check, List, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PlaylistManagerProps {
  walletAddress: string;
  nfts: NFT[];
  onSelectPlaylist: (playlist: Playlist | null) => void;
  activePlaylistId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistManager({
  walletAddress,
  nfts,
  onSelectPlaylist,
  activePlaylistId,
  isOpen,
  onClose,
}: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Load playlists
  useEffect(() => {
    setPlaylists(loadPlaylists(walletAddress));
  }, [walletAddress]);

  const refresh = useCallback(() => {
    setPlaylists(loadPlaylists(walletAddress));
  }, [walletAddress]);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const pl = createPlaylist(walletAddress, newName.trim());
    setNewName("");
    setIsCreating(false);
    refresh();
    onSelectPlaylist(pl);
  }, [walletAddress, newName, refresh, onSelectPlaylist]);

  const handleDelete = useCallback(
    (id: string) => {
      deletePlaylist(walletAddress, id);
      refresh();
      if (activePlaylistId === id) onSelectPlaylist(null);
    },
    [walletAddress, activePlaylistId, refresh, onSelectPlaylist]
  );

  const handleRename = useCallback(
    (id: string) => {
      if (!editName.trim()) return;
      updatePlaylist(walletAddress, id, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      refresh();
    },
    [walletAddress, editName, refresh]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-black/60 dark:text-white/60" />
            <h2 className="text-lg font-medium tracking-tight text-black dark:text-white">
              Playlists
            </h2>
            <span className="text-xs text-black/40 dark:text-white/40">
              {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Playlist
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-black/10 dark:border-white/10 overflow-hidden"
            >
              <div className="p-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setIsCreating(false);
                  }}
                  placeholder="Playlist name..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                  autoFocus
                />
                <Button variant="outline" size="sm" onClick={handleCreate}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Playlist list */}
        <div className="flex-1 overflow-auto p-2">
          {playlists.length === 0 && !isCreating ? (
            <div className="text-center py-12">
              <List className="h-10 w-10 mx-auto text-black/15 dark:text-white/15 mb-3" />
              <p className="text-sm text-black/40 dark:text-white/40 font-light">
                No playlists yet
              </p>
              <p className="text-xs text-black/25 dark:text-white/25 font-light mt-1">
                Create one to curate your display
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* "All NFTs" option */}
              <button
                onClick={() => onSelectPlaylist(null)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                  !activePlaylistId
                    ? "bg-black/10 dark:bg-white/10"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs">
                  🎨
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black dark:text-white">
                    All NFTs
                  </p>
                  <p className="text-xs text-black/40 dark:text-white/40">
                    {nfts.length} items
                  </p>
                </div>
                {!activePlaylistId && (
                  <span className="text-xs text-black/40 dark:text-white/40">
                    Active
                  </span>
                )}
              </button>

              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-center gap-3 group ${
                    activePlaylistId === pl.id
                      ? "bg-black/10 dark:bg-white/10"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <button
                    onClick={() => onSelectPlaylist(pl)}
                    className="flex-1 min-w-0 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs">
                      📋
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === pl.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(pl.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => handleRename(pl.id)}
                          className="w-full px-2 py-1 text-sm rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-black dark:text-white focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <p
                            className="text-sm font-medium text-black dark:text-white truncate"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingId(pl.id);
                              setEditName(pl.name);
                            }}
                          >
                            {pl.name}
                          </p>
                          <p className="text-xs text-black/40 dark:text-white/40">
                            {pl.items.length} item
                            {pl.items.length !== 1 ? "s" : ""}
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activePlaylistId === pl.id && (
                      <span className="text-xs text-black/40 dark:text-white/40 mr-1">
                        Active
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pl.id);
                      }}
                      className="w-7 h-7 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center"
                      title="Delete playlist"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="border-t border-black/10 dark:border-white/10 px-4 py-3">
          <p className="text-xs text-black/30 dark:text-white/30 font-light text-center">
            💡 Add NFTs to playlists from the gallery grid. Double-click a name
            to rename.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/** Small inline button for adding current NFT to a playlist */
export function AddToPlaylistButton({
  walletAddress,
  tokenId,
  className,
}: {
  walletAddress: string;
  tokenId: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setPlaylists(loadPlaylists(walletAddress));
  }, [isOpen, walletAddress]);

  const handleAdd = (plId: string) => {
    addToPlaylist(walletAddress, plId, tokenId);
    setAdded(plId);
    setTimeout(() => {
      setAdded(null);
      setIsOpen(false);
    }, 600);
  };

  return (
    <div className={`relative ${className || ""}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/80"
        title="Add to playlist"
      >
        <Plus className="h-3.5 w-3.5 text-white" />
      </button>
      {isOpen && (
        <div
          className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-lg shadow-lg overflow-hidden z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-medium text-black/40 dark:text-white/40 px-3 py-2 border-b border-black/5 dark:border-white/5">
            Add to playlist
          </p>
          {playlists.length === 0 ? (
            <p className="text-xs text-black/30 dark:text-white/30 px-3 py-3 text-center">
              No playlists yet
            </p>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-black dark:text-white"
              >
                <span className="truncate">{pl.name}</span>
                {added === pl.id && (
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                )}
                {pl.items.includes(tokenId) && added !== pl.id && (
                  <span className="text-xs text-black/30 dark:text-white/30 shrink-0">
                    ✓
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
