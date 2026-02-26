import { Button } from "@/components/ui/button";

import type { NFT } from "@/lib/nft";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, EyeOff, Filter, Info, LayoutGrid, Maximize, Minimize, Pause, Pin, Play, Settings, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── localStorage curation helpers ───────────────────────────

function curKey(wallet: string, kind: 'hidden' | 'pinned') {
  return `distoken:${kind}:${wallet.toLowerCase()}`;
}
function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); }
  catch { return new Set(); }
}
function saveSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

// ── Dominant color extraction ───────────────────────────────

function extractDominantColor(imgSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 16; // Sample at very small size for speed
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve('rgba(0,0,0,0.9)'); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, count = 0;
        // Sample edge pixels for background color
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
              const i = (y * size + x) * 4;
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              count++;
            }
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Darken slightly for better contrast
        r = Math.round(r * 0.3);
        g = Math.round(g * 0.3);
        b = Math.round(b * 0.3);
        resolve(`rgb(${r},${g},${b})`);
      } catch {
        resolve('rgba(0,0,0,0.9)');
      }
    };
    img.onerror = () => resolve('rgba(0,0,0,0.9)');
    img.src = imgSrc;
  });
}

// ── Media renderer ──────────────────────────────────────────

function NFTMedia({
  nft,
  maxStyle,
  className,
  onVideoEnd,
}: {
  nft: NFT;
  maxStyle: React.CSSProperties;
  className?: string;
  onVideoEnd?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = nft.animationUrl || nft.imageUrl;
  const type = nft.mediaType;

  if (type === 'video' && (nft.animationUrl || /\.(mp4|webm|ogv|mov)$/i.test(nft.imageUrl))) {
    return (
      <video
        ref={videoRef}
        src={nft.animationUrl || nft.imageUrl}
        poster={nft.imageUrl || undefined}
        autoPlay
        muted
        loop={!onVideoEnd}
        playsInline
        onEnded={onVideoEnd}
        className={className}
        style={{ ...maxStyle, objectFit: 'contain' }}
      />
    );
  }

  // GIF detection — render as img (browsers handle GIF natively)
  // Default: image
  return (
    <img
      src={nft.imageUrl || src}
      alt={nft.name || "NFT"}
      className={className}
      style={{ ...maxStyle, objectFit: 'contain' }}
    />
  );
}

// ── Blurred background component ────────────────────────────

function BlurredBackground({ src, fallbackColor }: { src?: string; fallbackColor: string }) {
  if (!src) {
    return <div className="absolute inset-0" style={{ backgroundColor: fallbackColor }} />;
  }
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: fallbackColor }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(60px) saturate(1.5) brightness(0.35)',
          transform: 'scale(1.3)', // Prevent blur edge artifacts
        }}
      />
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/30" />
    </>
  );
}

// ── Main component ──────────────────────────────────────────

interface NFTSlideshowProps {
  nfts: NFT[];
  walletAddress: string;
  chain?: 'ethereum' | 'solana';
  autoPlaySpeed?: number;
  onChangeWallet?: () => void;
  kioskMode?: boolean;
}

const SPEED_PRESETS = {
  slow: { label: "Slow", value: 8000 },
  normal: { label: "Normal", value: 5000 },
  fast: { label: "Fast", value: 3000 },
  veryFast: { label: "Very Fast", value: 1500 },
};

export function NFTSlideshow({ nfts: rawNfts, walletAddress, chain, onChangeWallet, kioskMode = false }: NFTSlideshowProps) {
  // ── Curation state ───────────────────────────────────────
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => loadSet(curKey(walletAddress, 'hidden')));
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadSet(curKey(walletAddress, 'pinned')));

  // ── Collection filter ────────────────────────────────────
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const collections = useMemo(() => {
    const names = new Set<string>();
    rawNfts.forEach(n => { if (n.collectionName) names.add(n.collectionName); });
    return [...names].sort();
  }, [rawNfts]);

  // Pinned first, then rest, excluding hidden, filtered by collection
  const nfts = useMemo(() => {
    const filtered = rawNfts.filter(n => {
      if (hiddenIds.has(n.tokenId)) return false;
      if (selectedCollection && n.collectionName !== selectedCollection) return false;
      return true;
    });
    return [
      ...filtered.filter(n => pinnedIds.has(n.tokenId)),
      ...filtered.filter(n => !pinnedIds.has(n.tokenId)),
    ];
  }, [rawNfts, hiddenIds, pinnedIds, selectedCollection]);

  const toggleHide = useCallback((id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveSet(curKey(walletAddress, 'hidden'), next);
      return next;
    });
    setPinnedIds(prev => { const next = new Set(prev); next.delete(id); saveSet(curKey(walletAddress, 'pinned'), next); return next; });
  }, [walletAddress]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveSet(curKey(walletAddress, 'pinned'), next);
      return next;
    });
  }, [walletAddress]);

  // ── Slideshow state ──────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(kioskMode);
  const [speed, setSpeed] = useState<keyof typeof SPEED_PRESETS>("normal");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showGalleryHeader, setShowGalleryHeader] = useState(true);
  const [showFullscreenControls, setShowFullscreenControls] = useState(!kioskMode);
  const [showMetadata, setShowMetadata] = useState(!kioskMode);
  const [hoveredNFT, setHoveredNFT] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('rgba(0,0,0,0.9)');
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset index when nfts list changes
  useEffect(() => {
    if (currentIndex >= nfts.length && nfts.length > 0) {
      setCurrentIndex(0);
    }
  }, [nfts.length, currentIndex]);

  const currentNFT = nfts[currentIndex];
  const currentSpeed = SPEED_PRESETS[speed].value;

  // Extract dominant color for current NFT
  useEffect(() => {
    if (currentNFT?.imageUrl) {
      extractDominantColor(currentNFT.imageUrl).then(setBgColor);
    }
  }, [currentNFT?.imageUrl]);

  const formatAddress = (address: string) => {
    if (address.includes('.eth') || address.includes('.sol')) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || nfts.length <= 1) return;
    // For video NFTs, don't auto-advance — let the video end handler do it
    if (currentNFT?.mediaType === 'video') return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % nfts.length);
    }, currentSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, nfts.length, currentSpeed, currentNFT?.mediaType]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % nfts.length);
  }, [nfts.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + nfts.length) % nfts.length);
  }, [nfts.length]);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const toggleFullscreen = useCallback(() => setIsFullscreen(p => !p), []);
  const toggleMetadata = useCallback(() => setShowMetadata(p => !p), []);

  // Handle video end → advance
  const handleVideoEnd = useCallback(() => {
    if (isPlaying && nfts.length > 1) {
      goToNext();
    }
  }, [isPlaying, nfts.length, goToNext]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  const handleSpeedChange = (newSpeed: keyof typeof SPEED_PRESETS) => {
    setSpeed(newSpeed);
    setIsSettingsOpen(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    if (!isSettingsOpen && !isFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isSettingsOpen && !target.closest('[data-settings-button]') && !target.closest('[data-settings-dropdown]')) {
        setIsSettingsOpen(false);
      }
      if (isFilterOpen && !target.closest('[data-filter-button]') && !target.closest('[data-filter-dropdown]')) {
        setIsFilterOpen(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
  }, [isSettingsOpen, isFilterOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "f" || e.key === "F") toggleFullscreen();
      if (e.key === "i" || e.key === "I") toggleMetadata();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, togglePlay, toggleFullscreen, toggleMetadata]);

  // Kiosk mode: hide cursor after inactivity
  useEffect(() => {
    if (!kioskMode && !isFullscreen) return;
    let timeout: NodeJS.Timeout;
    const hide = () => { document.body.style.cursor = 'none'; };
    const show = () => {
      document.body.style.cursor = 'auto';
      clearTimeout(timeout);
      timeout = setTimeout(hide, 3000);
    };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('mousedown', show);
    return () => {
      clearTimeout(timeout);
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', show);
      window.removeEventListener('mousedown', show);
    };
  }, [kioskMode, isFullscreen]);

  if (!currentNFT) return null;

  const maxStyleNormal: React.CSSProperties = {
    maxWidth: 'calc(100vw - 4rem)',
    maxHeight: 'calc(100vh - 350px)',
    width: 'auto',
    height: 'auto',
  };

  const maxStyleFullscreen: React.CSSProperties = {
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: 'auto',
    height: 'auto',
  };

  // ── Settings dropdown (shared between normal + fullscreen) ──
  const renderSettingsDropdown = (isDark: boolean) => (
    <div
      className={`absolute bottom-full right-0 mb-2 w-56 p-2 rounded-md border shadow-lg z-50 ${
        isDark ? 'bg-white text-black border-black/20' : 'bg-white text-black border-black/20'
      }`}
      data-settings-dropdown
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold text-black/60 px-2 py-1">Slideshow Speed</p>
        {Object.entries(SPEED_PRESETS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => handleSpeedChange(key as keyof typeof SPEED_PRESETS)}
            className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
              speed === key ? "bg-black text-white font-medium" : "hover:bg-black/10 font-normal text-black"
            }`}
          >
            {label}
          </button>
        ))}
        {hiddenIds.size > 0 && (
          <div className="border-t border-black/10 mt-1 pt-1">
            <button
              onClick={() => { setHiddenIds(new Set()); saveSet(curKey(walletAddress, 'hidden'), new Set()); setIsSettingsOpen(false); }}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-black/10 transition-colors flex items-center gap-2 text-red-600"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Restore {hiddenIds.size} hidden NFT{hiddenIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Collection filter dropdown ──
  const renderFilterDropdown = () => (
    <div
      className="absolute bottom-full right-0 mb-2 w-64 p-2 rounded-md border bg-white text-black border-black/20 shadow-lg z-50 max-h-80 overflow-auto"
      data-filter-dropdown
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold text-black/60 px-2 py-1">Filter by Collection</p>
        <button
          onClick={() => { setSelectedCollection(null); setIsFilterOpen(false); }}
          className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
            !selectedCollection ? "bg-black text-white font-medium" : "hover:bg-black/10 font-normal text-black"
          }`}
        >
          All Collections ({rawNfts.filter(n => !hiddenIds.has(n.tokenId)).length})
        </button>
        {collections.map(name => {
          const count = rawNfts.filter(n => n.collectionName === name && !hiddenIds.has(n.tokenId)).length;
          return (
            <button
              key={name}
              onClick={() => { setSelectedCollection(name); setIsFilterOpen(false); setCurrentIndex(0); }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${
                selectedCollection === name ? "bg-black text-white font-medium" : "hover:bg-black/10 font-normal text-black"
              }`}
            >
              {name} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Control buttons (shared) ──
  const renderControls = (isDark: boolean) => {
    const btnClass = isDark
      ? "border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
      : "border-border/50 hover:bg-accent";
    return (
      <div className="flex items-center gap-3">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-light ${isDark ? 'text-white/70' : 'text-muted-foreground'}`}>
            {currentIndex + 1}
          </span>
          <div className={`w-24 h-px ${isDark ? 'bg-white/30' : 'bg-border'}`}>
            <div
              className={`h-full transition-all duration-300 ${isDark ? 'bg-white' : 'bg-foreground'}`}
              style={{ width: `${((currentIndex + 1) / nfts.length) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-light ${isDark ? 'text-white/70' : 'text-muted-foreground'}`}>
            {nfts.length}
          </span>
        </div>

        {/* Play/Pause */}
        <Button variant="outline" size="icon" onClick={togglePlay}
          className={`${btnClass} transition-colors h-9 w-9 rounded-full`}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Metadata Toggle */}
        <Button variant="outline" size="icon" onClick={toggleMetadata}
          className={`${btnClass} transition-colors h-9 w-9 rounded-full ${showMetadata ? 'ring-1 ring-white/50' : ''}`}
          title="Toggle info (I)">
          <Info className="h-4 w-4" />
        </Button>

        {/* Collection Filter */}
        {collections.length > 1 && (
          <div className="relative">
            <Button variant="outline" size="icon"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`${btnClass} transition-colors h-9 w-9 rounded-full ${selectedCollection ? 'ring-1 ring-white/50' : ''}`}
              data-filter-button>
              <Filter className="h-4 w-4" />
            </Button>
            {isFilterOpen && renderFilterDropdown()}
          </div>
        )}

        {/* Gallery */}
        <Button variant="outline" size="icon"
          onClick={() => { setIsGalleryOpen(!isGalleryOpen); setShowGalleryHeader(true); }}
          className={`${btnClass} transition-colors h-9 w-9 rounded-full`}>
          <LayoutGrid className="h-4 w-4" />
        </Button>

        {/* Settings */}
        <div className="relative">
          <Button variant="outline" size="icon"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`${btnClass} transition-colors h-9 w-9 rounded-full`}
            data-settings-button>
            <Settings className="h-4 w-4" />
          </Button>
          {isSettingsOpen && renderSettingsDropdown(isDark)}
        </div>

        {/* Fullscreen */}
        <Button variant="outline" size="icon" onClick={toggleFullscreen}
          className={`${btnClass} transition-colors h-9 w-9 rounded-full`}>
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    );
  };

  // ── Metadata overlay ──
  const renderMetadataOverlay = (isDark: boolean) => {
    if (!showMetadata) return null;
    return (
      <div className={`flex-1 space-y-2 ${isDark ? '' : ''}`}>
        <h2 className={`text-2xl font-medium tracking-tight ${isDark ? 'text-white' : ''}`}>
          {currentNFT.name || `#${currentNFT.tokenId}`}
        </h2>
        <p className={`text-sm font-light ${isDark ? 'text-white/70' : 'text-muted-foreground'}`}>
          {currentNFT.collectionName || "Unknown Collection"}
          {currentNFT.mediaType === 'video' && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/20">▶ Video</span>
          )}
        </p>
        {currentNFT.description && (
          <p className={`text-sm font-light max-w-2xl line-clamp-2 ${isDark ? 'text-white/60' : 'text-muted-foreground/80'}`}>
            {currentNFT.description}
          </p>
        )}
      </div>
    );
  };

  // ── Navigation arrows ──
  const renderArrows = (isDark: boolean) => {
    if (nfts.length <= 1) return null;
    const cls = isDark
      ? "border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
      : "border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent";
    const size = isDark ? "h-12 w-12" : "h-10 w-10";
    const iconSize = isDark ? "h-6 w-6" : "h-5 w-5";
    return (
      <>
        <Button variant="outline" size="icon" onClick={goToPrevious}
          className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 ${cls} transition-all ${size} rounded-full shadow-refined`}>
          <ChevronLeft className={iconSize} />
        </Button>
        <Button variant="outline" size="icon" onClick={goToNext}
          className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 ${cls} transition-all ${size} rounded-full shadow-refined`}>
          <ChevronRight className={iconSize} />
        </Button>
      </>
    );
  };

  // ════════════════════════════════════════════════════════════
  // FULLSCREEN / KIOSK MODE
  // ════════════════════════════════════════════════════════════
  if (isFullscreen || kioskMode) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
          onMouseMove={() => {
            setShowFullscreenControls(true);
            if (fullscreenTimeoutRef.current) clearTimeout(fullscreenTimeoutRef.current);
            fullscreenTimeoutRef.current = setTimeout(() => {
              if (!isSettingsOpen && !isFilterOpen) setShowFullscreenControls(false);
            }, kioskMode ? 2000 : 2500);
          }}
        >
          {/* Blurred palette background */}
          <BlurredBackground src={currentNFT.imageUrl} fallbackColor={bgColor} />

          {/* Artwork */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="relative z-10 w-full h-full flex items-center justify-center p-8"
            >
              <NFTMedia
                nft={currentNFT}
                maxStyle={maxStyleFullscreen}
                className="rounded-lg shadow-2xl"
                onVideoEnd={handleVideoEnd}
              />
            </motion.div>
          </AnimatePresence>

          {/* Hover overlay with controls */}
          <div className="absolute inset-0 z-20">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showFullscreenControls ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.5) 100%)' }}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: showFullscreenControls ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              style={{ pointerEvents: showFullscreenControls ? 'auto' : 'none' }}
              className="absolute inset-0"
            >
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-base font-light tracking-tight text-white">
                      <span className="font-medium">{formatAddress(walletAddress)}</span>
                    </h1>
                    {chain && (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full border"
                        style={
                          chain === 'solana'
                            ? { background: 'rgba(153,69,255,0.2)', borderColor: 'rgba(153,69,255,0.5)', color: '#C084FC' }
                            : { background: 'rgba(98,126,234,0.2)', borderColor: 'rgba(98,126,234,0.5)', color: '#93A8F4' }
                        }
                      >
                        {chain === 'solana' ? '◎ Solana' : 'Ξ Ethereum'}
                      </span>
                    )}
                    {selectedCollection && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-white/30 text-white/80 bg-white/10">
                        {selectedCollection}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => { setIsFullscreen(false); }}
                    variant="outline" size="sm"
                    className="border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors font-light"
                  >
                    <Minimize className="h-4 w-4 mr-2" />
                    {kioskMode ? 'Exit Kiosk' : 'Exit Fullscreen'}
                  </Button>
                </div>
              </div>

              {/* Navigation arrows */}
              {renderArrows(true)}

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                  {renderMetadataOverlay(true)}
                  {renderControls(true)}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Kiosk metadata — subtle persistent overlay when metadata is ON */}
          {kioskMode && showMetadata && !showFullscreenControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-0 left-0 right-0 z-20 p-6"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
            >
              <h2 className="text-xl font-medium text-white">{currentNFT.name || `#${currentNFT.tokenId}`}</h2>
              <p className="text-sm text-white/60 font-light">{currentNFT.collectionName || "Unknown"}</p>
            </motion.div>
          )}
        </div>

        {/* Gallery popover (rendered above fullscreen) */}
        {isGalleryOpen && renderGallery()}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════
  // NORMAL MODE
  // ════════════════════════════════════════════════════════════

  // Gallery popover renderer (shared)
  function renderGallery() {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setIsGalleryOpen(false)}
      >
        <div
          className="bg-background border border-border/30 rounded-lg shadow-refined max-w-6xl w-full max-h-[80vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
          onScroll={(e) => setShowGalleryHeader(e.currentTarget.scrollTop < 50)}
        >
          <div className={`sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/30 p-4 flex items-center justify-between transition-all duration-300 ${
            showGalleryHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
          }`}>
            <h3 className="text-lg font-medium tracking-tight">
              {formatAddress(walletAddress)} gallery
              {selectedCollection && <span className="text-sm font-light text-muted-foreground ml-2">— {selectedCollection}</span>}
            </h3>
            <Button variant="outline" size="sm" onClick={() => setIsGalleryOpen(false)}
              className="border-border/50 hover:bg-accent transition-colors font-light">
              Close
            </Button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {nfts.map((nft, index) => (
                <div key={`${nft.contractAddress}-${nft.tokenId}`} className="relative group/card">
                  <button
                    onClick={() => { setCurrentIndex(index); setIsPlaying(false); setIsGalleryOpen(false); }}
                    className={`w-full relative transition-all duration-300 rounded-lg ${
                      index === currentIndex ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'hover:scale-105'
                    }`}
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      {nft.imageUrl ? (
                        <>
                          <img src={nft.imageUrl} alt={nft.name || `NFT #${nft.tokenId}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 rounded-lg border border-border/20 pointer-events-none" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                      )}
                      {/* Video badge */}
                      {nft.mediaType === 'video' && (
                        <div className="absolute top-1 left-1 text-xs px-1 py-0.5 rounded bg-black/60 text-white">▶</div>
                      )}
                      <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-white text-xs font-light line-clamp-2">{nft.name || `#${nft.tokenId}`}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="absolute top-1 right-1 gap-1 hidden group-hover/card:flex z-10">
                    <button onClick={() => togglePin(nft.tokenId)} title="Pin" className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/90 transition-colors">
                      <Pin className={`h-3 w-3 ${pinnedIds.has(nft.tokenId) ? 'text-yellow-400' : 'text-white'}`} />
                    </button>
                    <button onClick={() => toggleHide(nft.tokenId)} title="Hide" className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-600 transition-colors">
                      <EyeOff className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {hiddenIds.size > 0 && (
              <div className="mt-8 border-t border-border/30 pt-6">
                <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Hidden ({hiddenIds.size})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {rawNfts.filter(n => hiddenIds.has(n.tokenId)).map(nft => (
                    <div key={nft.tokenId} className="relative group/card opacity-40 hover:opacity-80 transition-opacity">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        {nft.imageUrl && <img src={nft.imageUrl} alt={nft.name || ''} className="w-full h-full object-cover grayscale" />}
                      </div>
                      <button onClick={() => toggleHide(nft.tokenId)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-green-600 transition-colors" title="Restore">
                        <Undo2 className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative w-full h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-base font-light tracking-tight">
                  DisToken belongs to{" "}
                  <span className="font-medium">{formatAddress(walletAddress)}</span>
                </h1>
                {chain && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={
                      chain === 'solana'
                        ? { background: 'rgba(153,69,255,0.12)', borderColor: 'rgba(153,69,255,0.35)', color: '#9945FF' }
                        : { background: 'rgba(98,126,234,0.12)', borderColor: 'rgba(98,126,234,0.35)', color: '#627EEA' }
                    }
                  >
                    {chain === 'solana' ? '◎ Solana' : 'Ξ Ethereum'}
                  </span>
                )}
                {selectedCollection && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                    {selectedCollection}
                    <button onClick={() => setSelectedCollection(null)} className="ml-1.5 hover:text-foreground">×</button>
                  </span>
                )}
              </div>
              {onChangeWallet && (
                <Button onClick={onChangeWallet} variant="outline" size="sm"
                  className="border-border/50 hover:bg-accent transition-colors font-light">
                  Change Wallet
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Image Area with blurred background */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
          {/* Blurred palette background */}
          <BlurredBackground src={currentNFT.imageUrl} fallbackColor={bgColor} />

          <div className="relative z-10 w-full h-full flex items-center justify-center px-4 md:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="w-full h-full flex items-center justify-center"
              >
                <div
                  className="relative max-w-full max-h-full group/nft"
                  onMouseEnter={() => setHoveredNFT(currentNFT.tokenId)}
                  onMouseLeave={() => setHoveredNFT(null)}
                  style={{ overflow: 'hidden', borderRadius: 8 }}
                >
                  <NFTMedia
                    nft={currentNFT}
                    maxStyle={maxStyleNormal}
                    className="shadow-refined rounded-lg"
                    onVideoEnd={handleVideoEnd}
                  />
                  <div className="absolute inset-0 rounded-lg border border-white/10 pointer-events-none" />
                  {/* Curation buttons on hover */}
                  {hoveredNFT === currentNFT.tokenId && (
                    <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                      <button onClick={() => togglePin(currentNFT.tokenId)} title={pinnedIds.has(currentNFT.tokenId) ? 'Unpin' : 'Pin'}
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors">
                        <Pin className={`h-3.5 w-3.5 ${pinnedIds.has(currentNFT.tokenId) ? 'text-yellow-400' : 'text-white'}`} />
                      </button>
                      <button onClick={() => toggleHide(currentNFT.tokenId)} title="Hide"
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-red-600/80 transition-colors">
                        <EyeOff className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            {renderArrows(false)}
          </div>
        </div>

        {/* Bottom panel */}
        <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="container py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {renderMetadataOverlay(false)}
              {renderControls(false)}
            </div>
          </div>
        </div>
      </div>

      {isGalleryOpen && renderGallery()}
    </>
  );
}
