import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { NFT } from '@/lib/nft';

type GridSize = 2 | 3 | 4;

interface GalleryWallProps {
  nfts: NFT[];
  gridSize: GridSize;
  intervalMs?: number;
  frameStyle?: string;
}

interface CellState {
  nft: NFT;
  key: number; // Used as AnimatePresence key to trigger transition
}

/** Each cell independently manages its own NFT rotation */
function WallCell({
  nft,
  cellKey,
  onClick,
  frameStyle,
}: {
  nft: NFT;
  cellKey: number;
  onClick: () => void;
  frameStyle?: string;
}) {
  const frameClasses: Record<string, string> = {
    none: '',
    minimal: 'ring-1 ring-black/30',
    gallery: 'ring-[8px] ring-white shadow-lg',
    modern: 'shadow-2xl shadow-black/60',
    ornate: 'ring-4 ring-yellow-600/70 shadow-[0_0_20px_rgba(180,130,0,0.3)]',
  };
  const frameCls = frameClasses[frameStyle || 'none'] || '';

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-lg bg-black cursor-pointer ${frameCls}`}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={cellKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {nft.mediaType === 'video' && nft.animationUrl ? (
            <video
              src={nft.animationUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={nft.imageUrl}
              alt={nft.name || 'NFT'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors duration-300 flex items-end p-2">
            <p className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity line-clamp-1">
              {nft.name || `#${nft.tokenId}`}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function GalleryWall({
  nfts,
  gridSize,
  intervalMs = 6000,
  frameStyle,
}: GalleryWallProps) {
  const cellCount = gridSize * gridSize;
  const keyCounterRef = useRef(0);

  // Initialize cells: distribute NFTs across cells
  const [cells, setCells] = useState<CellState[]>(() => {
    if (nfts.length === 0) return [];
    return Array.from({ length: cellCount }, (_, i) => ({
      nft: nfts[i % nfts.length],
      key: i,
    }));
  });

  // Track which NFT index each cell last showed
  const cellNFTIndexRef = useRef<number[]>(
    Array.from({ length: cellCount }, (_, i) => i % nfts.length)
  );

  // Staggered rotation: each cell advances independently
  useEffect(() => {
    if (nfts.length <= cellCount) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let cellIdx = 0; cellIdx < cellCount; cellIdx++) {
      const staggerDelay = (cellIdx * intervalMs) / cellCount;

      const schedule = () => {
        timers[cellIdx] = setTimeout(() => {
          // Advance this cell's NFT
          const nextNFTIdx = (cellNFTIndexRef.current[cellIdx] + cellCount) % nfts.length;
          cellNFTIndexRef.current[cellIdx] = nextNFTIdx;
          keyCounterRef.current += 1;
          const newKey = keyCounterRef.current;

          setCells(prev => {
            const next = [...prev];
            next[cellIdx] = { nft: nfts[nextNFTIdx], key: newKey };
            return next;
          });

          // Schedule next for this cell
          schedule();
        }, intervalMs);
      };

      // First tick after stagger delay
      timers[cellIdx] = setTimeout(() => {
        const nextNFTIdx = (cellNFTIndexRef.current[cellIdx] + cellCount) % nfts.length;
        cellNFTIndexRef.current[cellIdx] = nextNFTIdx;
        keyCounterRef.current += 1;
        const newKey = keyCounterRef.current;
        setCells(prev => {
          const next = [...prev];
          next[cellIdx] = { nft: nfts[nextNFTIdx], key: newKey };
          return next;
        });
        // After stagger, use regular interval
        schedule();
      }, staggerDelay);
    }

    return () => timers.forEach(t => clearTimeout(t));
  }, [nfts, cellCount, intervalMs]);

  // Update cells when nfts changes
  useEffect(() => {
    if (nfts.length === 0) return;
    setCells(Array.from({ length: cellCount }, (_, i) => ({
      nft: nfts[i % nfts.length],
      key: i,
    })));
    cellNFTIndexRef.current = Array.from({ length: cellCount }, (_, i) => i % nfts.length);
  }, [nfts, cellCount]);

  const gap = gridSize === 4 ? 'gap-1' : gridSize === 3 ? 'gap-2' : 'gap-3';

  return (
    <div className={`w-full h-full grid ${gap}`} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
      {cells.map((cell, idx) => (
        <WallCell
          key={idx}
          nft={cell.nft}
          cellKey={cell.key}
          onClick={() => {}}
          frameStyle={frameStyle}
        />
      ))}
    </div>
  );
}

export type { GridSize };
