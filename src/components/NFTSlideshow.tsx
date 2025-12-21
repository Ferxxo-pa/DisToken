import { Button } from "@/components/ui/button";

import type { NFT } from "@/lib/nft";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Pause, Play, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface NFTSlideshowProps {
  nfts: NFT[];
  walletAddress: string;
  autoPlaySpeed?: number;
  onChangeWallet?: () => void;
}

const SPEED_PRESETS = {
  slow: { label: "Slow", value: 8000 },
  normal: { label: "Normal", value: 5000 },
  fast: { label: "Fast", value: 3000 },
  veryFast: { label: "Very Fast", value: 1500 },
};

export function NFTSlideshow({ nfts, walletAddress, onChangeWallet }: NFTSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState<keyof typeof SPEED_PRESETS>("normal");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentNFT = nfts[currentIndex];
  const currentSpeed = SPEED_PRESETS[speed].value;

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (address.includes('.eth')) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || nfts.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % nfts.length);
    }, currentSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, nfts.length, currentSpeed]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % nfts.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + nfts.length) % nfts.length);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  const handleSpeedChange = (newSpeed: keyof typeof SPEED_PRESETS) => {
    setSpeed(newSpeed);
    setIsSettingsOpen(false);
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking the settings button or dropdown itself
      if (target.closest('[data-settings-button]') || target.closest('[data-settings-dropdown]')) {
        return;
      }
      setIsSettingsOpen(false);
    };

    // Small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nfts.length]);

  if (!currentNFT) return null;

  return (
    <>
    <div 
      ref={containerRef}
      className="relative w-full h-screen flex flex-col bg-background"
    >
      {/* Header */}
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-base font-light tracking-tight">
                DisToken belongs to{" "}
                <span className="font-medium">
                  {formatAddress(walletAddress)}
                </span>
              </h1>
            </div>
            
            {onChangeWallet && (
              <Button
                onClick={onChangeWallet}
                variant="outline"
                size="sm"
                className="border-border/50 hover:bg-accent transition-colors font-light"
              >
                Change Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Image Area */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden px-4 md:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full flex items-center justify-center"
          >
            {currentNFT.imageUrl ? (
              <div className="relative max-w-full max-h-full">
                <img
                  src={currentNFT.imageUrl}
                  alt={currentNFT.name || "NFT"}
                  className="w-auto h-auto object-contain shadow-refined rounded-lg"
                  style={{
                    maxWidth: isFullscreen ? '90vw' : 'calc(100vw - 4rem)',
                    maxHeight: isFullscreen ? '90vh' : 'calc(100vh - 350px)'
                  }}
                />
                {/* Subtle border effect */}
                <div className="absolute inset-0 rounded-lg border border-border/20 pointer-events-none" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center border border-border/30 rounded-lg bg-muted/20">
                <p className="text-muted-foreground font-light">No image available</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {nfts.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent transition-all h-10 w-10 rounded-full shadow-refined"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent transition-all h-10 w-10 rounded-full shadow-refined"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Metadata Panel */}
      {!isFullscreen && (
      <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* NFT Info */}
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-medium tracking-tight">
                {currentNFT.name || `#${currentNFT.tokenId}`}
              </h2>
              <p className="text-sm text-muted-foreground font-light">
                {currentNFT.collectionName || "Unknown Collection"}
              </p>
              {currentNFT.description && (
                <p className="text-sm text-muted-foreground/80 font-light max-w-2xl line-clamp-2">
                  {currentNFT.description}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Progress */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-light text-muted-foreground">
                  {currentIndex + 1}
                </span>
                <div className="w-24 h-px bg-border">
                  <div
                    className="h-full bg-foreground transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / nfts.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-light text-muted-foreground">
                  {nfts.length}
                </span>
              </div>

              {/* Play/Pause */}
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlay}
                className="border-border/50 hover:bg-accent transition-colors h-9 w-9 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Speed Settings */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="border-border/50 hover:bg-accent transition-colors h-9 w-9 rounded-full"
                  data-settings-button
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {isSettingsOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-white text-black rounded-md border border-black/20 shadow-lg z-50" data-settings-dropdown>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-black/60 px-2 py-1">
                        Slideshow Speed
                      </p>
                      {Object.entries(SPEED_PRESETS).map(([key, { label }]) => (
                        <button
                          key={key}
                          onClick={() => {
                            handleSpeedChange(key as keyof typeof SPEED_PRESETS);
                            setIsSettingsOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
                            speed === key
                              ? "bg-black text-white font-medium"
                              : "hover:bg-black/10 font-normal text-black"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleFullscreen}
                className="border-border/50 hover:bg-accent transition-colors h-9 w-9 rounded-full"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>

    {/* Fullscreen Overlay */}
    {isFullscreen && (
      <div 
        className="fixed inset-0 z-40 bg-background flex items-center justify-center"
        onMouseMove={() => {
          setShowFullscreenControls(true);
          if (fullscreenTimeoutRef.current) {
            clearTimeout(fullscreenTimeoutRef.current);
          }
          fullscreenTimeoutRef.current = setTimeout(() => {
            // Don't hide controls if settings popover is open
            if (!isSettingsOpen) {
              setShowFullscreenControls(false);
            }
          }, 2500);
        }}
      >
        {/* Fullscreen Artwork (always visible) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full flex items-center justify-center p-8"
          >
            {currentNFT.imageUrl ? (
              <img
                src={currentNFT.imageUrl}
                alt={currentNFT.name || "NFT"}
                className="w-auto h-auto object-contain"
                style={{
                  maxWidth: '90vw',
                  maxHeight: '90vh'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground font-light">No image available</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Hover Overlay with Controls */}
        <div className="absolute inset-0">
          {/* Background overlay that fades */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: (showFullscreenControls || isSettingsOpen) ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none"
          />
          
          {/* Controls layer - always accepts pointer events */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: (showFullscreenControls || isSettingsOpen) ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            style={{ pointerEvents: 'auto' }}
          >
          {/* Header with wallet info and exit button */}
          <div className="absolute top-0 left-0 right-0 p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-light tracking-tight text-white">
                DisToken belongs to{" "}
                <span className="font-medium">
                  {formatAddress(walletAddress)}
                </span>
              </h1>
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                className="border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors font-light"
              >
                <Minimize className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </Button>
            </div>
          </div>

          {/* Navigation Arrows */}
          {nfts.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-8 top-1/2 -translate-y-1/2 border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all h-12 w-12 rounded-full"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
                className="absolute right-8 top-1/2 -translate-y-1/2 border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all h-12 w-12 rounded-full"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Bottom metadata and controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div className="flex-1 space-y-2">
                <h2 className="text-2xl font-medium tracking-tight text-white">
                  {currentNFT.name || `#${currentNFT.tokenId}`}
                </h2>
                <p className="text-sm text-white/70 font-light">
                  {currentNFT.collectionName || "Unknown Collection"}
                </p>
                {currentNFT.description && (
                  <p className="text-sm text-white/60 font-light max-w-2xl line-clamp-2">
                    {currentNFT.description}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-light text-white/70">
                    {currentIndex + 1}
                  </span>
                  <div className="w-24 h-px bg-white/30">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${((currentIndex + 1) / nfts.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-light text-white/70">
                    {nfts.length}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePlay}
                  className="border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors h-9 w-9 rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors h-9 w-9 rounded-full"
                  data-settings-button
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          </motion.div>
          
          {/* Settings dropdown - rendered outside motion.div to avoid opacity fade */}
          {isSettingsOpen && (
            <div className="absolute bottom-24 right-6 w-48 p-2 bg-white text-black rounded-md border border-black/20 shadow-lg z-50" data-settings-dropdown>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-black/60 px-2 py-1">
                  Slideshow Speed
                </p>
                {Object.entries(SPEED_PRESETS).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => {
                      handleSpeedChange(key as keyof typeof SPEED_PRESETS);
                      setIsSettingsOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
                      speed === key
                        ? "bg-black text-white font-medium"
                        : "hover:bg-black/10 font-normal text-black"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
