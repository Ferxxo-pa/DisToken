import { Button } from "@/components/ui/button";
import { AddToPlaylistButton, PlaylistManager } from "@/components/PlaylistManager";
import { RemoteQROverlay } from "@/components/RemoteControl";
import { Walkthrough } from "@/components/Walkthrough";

import type { NFT } from "@/lib/nft";
import { isLikelyPixelArt } from "@/lib/nft";
import type { Playlist } from "@/lib/playlists";
import { loadPlaylists } from "@/lib/playlists";
import { RemoteHost, generateRoomCode, type RemoteCommand } from "@/lib/remote";
import { getActiveSlot, loadSchedule, type ScheduleSlot } from "@/lib/schedule";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Copy, Download, EyeOff, Filter, HelpCircle, Info, LayoutGrid, List,
  Maximize, Minimize, Moon, Music, Pause, Pin, Play,
  Settings, Shuffle, Smartphone, Sun, Undo2, Volume2, VolumeX
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── localStorage helpers ────────────────────────────────────

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

// ── Per-wallet display preferences ──────────────────────────

interface DisplayPrefs {
  speed?: string;
  transition?: string;
  bgMode?: string;
  customBgColor?: string;
  showMetadata?: boolean;
  isShuffle?: boolean;
}

function prefKey(wallet: string) { return `distoken:prefs:${wallet.toLowerCase()}`; }

function loadPrefs(wallet: string): DisplayPrefs {
  try { return JSON.parse(localStorage.getItem(prefKey(wallet)) ?? '{}'); }
  catch { return {}; }
}

function savePrefs(wallet: string, prefs: DisplayPrefs) {
  localStorage.setItem(prefKey(wallet), JSON.stringify(prefs));
}

// ── Shuffle utility ─────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ── Color extraction ────────────────────────────────────────

function extractDominantColor(imgSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 16;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve('rgba(0,0,0,0.9)'); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
              const i = (y * size + x) * 4;
              r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
          }
        }
        r = Math.round((r / count) * 0.3);
        g = Math.round((g / count) * 0.3);
        b = Math.round((b / count) * 0.3);
        resolve(`rgb(${r},${g},${b})`);
      } catch { resolve('rgba(0,0,0,0.9)'); }
    };
    img.onerror = () => resolve('rgba(0,0,0,0.9)');
    img.src = imgSrc;
  });
}

// ── Transition variants ─────────────────────────────────────

type TransitionType = 'fade' | 'slide' | 'zoom' | 'crossfade';
type BackgroundMode = 'blur' | 'dark' | 'light' | 'match' | 'custom';

const BG_PRESETS: Record<BackgroundMode, { label: string; desc: string }> = {
  blur: { label: 'Blur Fill', desc: 'Blurred artwork as ambient background' },
  dark: { label: 'Dark', desc: 'Pure black background' },
  light: { label: 'Light', desc: 'Clean white gallery wall' },
  match: { label: 'Match Color', desc: 'Solid color sampled from artwork' },
  custom: { label: 'Custom', desc: 'Choose your own color' },
};

const TRANSITIONS: Record<TransitionType, {
  initial: any; animate: any; exit: any; transition?: any;
}> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
  slide: {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
  zoom: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
  crossfade: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.8, ease: 'easeInOut' },
  },
};

// ── Pixel art detection via image load ──────────────────────

function usePixelArtDetection(nft: NFT | undefined): boolean {
  const [isPixel, setIsPixel] = useState(false);
  useEffect(() => {
    if (!nft) { setIsPixel(false); return; }
    // Check from metadata first
    if (isLikelyPixelArt(nft.originalWidth, nft.originalHeight)) {
      setIsPixel(true); return;
    }
    // Probe actual image dimensions
    if (nft.imageUrl && nft.mediaType === 'image') {
      const img = new Image();
      img.onload = () => setIsPixel(img.naturalWidth <= 128 && img.naturalHeight <= 128);
      img.onerror = () => setIsPixel(false);
      img.src = nft.imageUrl;
    } else {
      setIsPixel(false);
    }
  }, [nft?.tokenId, nft?.imageUrl]);
  return isPixel;
}

// ── Orientation detection ───────────────────────────────────

type Orientation = 'landscape' | 'portrait' | 'square' | 'unknown';

function useOrientationDetection(nft: NFT | undefined): Orientation {
  const [orientation, setOrientation] = useState<Orientation>('unknown');
  useEffect(() => {
    if (!nft) { setOrientation('unknown'); return; }
    if (nft.originalWidth && nft.originalHeight) {
      const ratio = nft.originalWidth / nft.originalHeight;
      setOrientation(ratio > 1.1 ? 'landscape' : ratio < 0.9 ? 'portrait' : 'square');
      return;
    }
    if (nft.imageUrl && nft.mediaType === 'image') {
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        setOrientation(ratio > 1.1 ? 'landscape' : ratio < 0.9 ? 'portrait' : 'square');
      };
      img.onerror = () => setOrientation('unknown');
      img.src = nft.imageUrl;
    }
  }, [nft?.tokenId, nft?.imageUrl]);
  return orientation;
}

// ── Image preloader (preloads next N images) ────────────────

function useImagePreloader(nfts: NFT[], currentIndex: number, ahead: number = 3) {
  useEffect(() => {
    for (let i = 1; i <= ahead; i++) {
      const idx = (currentIndex + i) % nfts.length;
      const nft = nfts[idx];
      if (nft?.imageUrl && nft.mediaType === 'image') {
        const img = new Image();
        img.src = nft.imageUrl;
      }
    }
  }, [currentIndex, nfts]);
}

// ── Media renderer ──────────────────────────────────────────

function NFTMedia({
  nft, maxStyle, className, onVideoEnd, isPixelArt, isMuted, onToggleMute,
}: {
  nft: NFT; maxStyle: React.CSSProperties; className?: string;
  onVideoEnd?: () => void; isPixelArt: boolean; isMuted: boolean; onToggleMute?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pixelStyle: React.CSSProperties = isPixelArt
    ? { imageRendering: 'pixelated' } : {};

  // Audio NFT — show cover art + audio player
  if (nft.mediaType === 'audio' && nft.animationUrl) {
    return (
      <div className="relative flex flex-col items-center gap-4">
        <img
          src={nft.imageUrl}
          alt={nft.name || "NFT"}
          className={className}
          style={{ ...maxStyle, objectFit: 'contain', ...pixelStyle }}
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
          <Music className="h-4 w-4 text-white/80" />
          <audio
            src={nft.animationUrl}
            autoPlay
            loop
            muted={isMuted}
            className="hidden"
          />
          <button onClick={onToggleMute} className="text-white/80 hover:text-white transition-colors">
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  // HTML / Generative art NFT — render in sandboxed iframe
  if (nft.mediaType === 'html' && nft.animationUrl) {
    return (
      <div className={`relative ${className || ''}`} style={{ ...maxStyle, width: maxStyle.maxWidth, height: maxStyle.maxHeight }}>
        <iframe
          src={nft.animationUrl}
          title={nft.name || 'Generative Art'}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full rounded-lg"
          style={{ border: 'none', minWidth: '60vw', minHeight: '60vh', ...maxStyle }}
          allow="accelerometer; autoplay"
        />
        <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-black/50 backdrop-blur-sm text-white/80 border border-white/10">
          ⟨/⟩ Live Generative
        </div>
      </div>
    );
  }

  // Video NFT
  if (nft.mediaType === 'video' && (nft.animationUrl || /\.(mp4|webm|ogv|mov)$/i.test(nft.imageUrl))) {
    return (
      <video
        ref={videoRef}
        src={nft.animationUrl || nft.imageUrl}
        poster={nft.imageUrl || undefined}
        autoPlay muted={isMuted} loop={!onVideoEnd} playsInline
        onEnded={onVideoEnd}
        className={className}
        style={{ ...maxStyle, objectFit: 'contain' }}
      />
    );
  }

  // Image (default)
  return (
    <img
      src={nft.imageUrl}
      alt={nft.name || "NFT"}
      className={className}
      style={{ ...maxStyle, objectFit: 'contain', ...pixelStyle }}
      loading="eager"
    />
  );
}

// ── Blurred background ──────────────────────────────────────

function BlurredBackground({ src, fallbackColor, mode, customColor }: {
  src?: string; fallbackColor: string; mode: BackgroundMode; customColor?: string;
}) {
  if (mode === 'dark') return <div className="absolute inset-0 bg-black" />;
  if (mode === 'light') return <div className="absolute inset-0 bg-white" />;
  if (mode === 'custom') return <div className="absolute inset-0" style={{ backgroundColor: customColor || '#1a1a2e' }} />;
  if (mode === 'match') return <div className="absolute inset-0" style={{ backgroundColor: fallbackColor }} />;
  // Default: blur
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: fallbackColor }} />
      {src && (
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(60px) saturate(1.5) brightness(0.35)', transform: 'scale(1.3)',
        }} />
      )}
      <div className="absolute inset-0 bg-black/30" />
    </>
  );
}

// ── Main component ──────────────────────────────────────────

interface NFTSlideshowProps {
  nfts: NFT[];
  walletAddress: string;
  chain?: 'ethereum' | 'solana';
  onChangeWallet?: () => void;
  kioskMode?: boolean;
}

const SPEED_PRESETS = {
  ambient: { label: "Ambient", value: 15000 },
  slow: { label: "Slow", value: 8000 },
  normal: { label: "Normal", value: 5000 },
  fast: { label: "Fast", value: 3000 },
  veryFast: { label: "Very Fast", value: 1500 },
};

export function NFTSlideshow({ nfts: rawNfts, walletAddress, chain, onChangeWallet, kioskMode = false }: NFTSlideshowProps) {
  // ── Curation state ───────────────────────────────────────
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => loadSet(curKey(walletAddress, 'hidden')));
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => loadSet(curKey(walletAddress, 'pinned')));
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Display state ────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(kioskMode);
  const [speed, setSpeed] = useState<keyof typeof SPEED_PRESETS>("normal");
  const [transition, setTransition] = useState<TransitionType>('fade');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showGalleryHeader, setShowGalleryHeader] = useState(true);
  const [showFullscreenControls, setShowFullscreenControls] = useState(!kioskMode);
  const [showMetadata, setShowMetadata] = useState(!kioskMode);
  const [hoveredNFT, setHoveredNFT] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('rgba(0,0,0,0.9)');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [bgMode, setBgMode] = useState<BackgroundMode>('blur');
  const [customBgColor, setCustomBgColor] = useState('#1a1a2e');
  const [, setIsBgPickerOpen] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [_showQR, _setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Playlist state ───────────────────────────────────────
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  // ── Remote control state ─────────────────────────────────
  const [roomCode] = useState(() => generateRoomCode());
  const [isRemoteOpen, setIsRemoteOpen] = useState(false);
  const remoteHostRef = useRef<RemoteHost | null>(null);

  // ── Schedule state ───────────────────────────────────────
  const [activeScheduleSlot, setActiveScheduleSlot] = useState<ScheduleSlot | null>(null);

  // ── Walkthrough state ────────────────────────────────────
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughForce, setWalkthroughForce] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const prefs = loadPrefs(walletAddress);
    if (prefs.speed) setSpeed(prefs.speed as keyof typeof SPEED_PRESETS);
    if (prefs.transition) setTransition(prefs.transition as TransitionType);
    if (prefs.bgMode) setBgMode(prefs.bgMode as BackgroundMode);
    if (prefs.customBgColor) setCustomBgColor(prefs.customBgColor);
    if (prefs.showMetadata !== undefined) setShowMetadata(prefs.showMetadata);
    if (prefs.isShuffle) setIsShuffle(prefs.isShuffle);
  }, [walletAddress]);

  // ── Derived data ─────────────────────────────────────────
  const collections = useMemo(() => {
    const names = new Set<string>();
    rawNfts.forEach(n => { if (n.collectionName) names.add(n.collectionName); });
    return [...names].sort();
  }, [rawNfts]);

  // Track shuffle seed to re-shuffle when toggled
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const nfts = useMemo(() => {
    let filtered = rawNfts.filter(n => {
      if (hiddenIds.has(n.tokenId)) return false;
      if (selectedCollection && n.collectionName !== selectedCollection) return false;
      return true;
    });
    // Playlist filter — if active, only show items in the playlist
    if (activePlaylist) {
      const playlistSet = new Set(activePlaylist.items);
      filtered = filtered.filter(n => playlistSet.has(n.tokenId));
    }
    // Schedule filter — override collection/playlist if schedule is active
    if (activeScheduleSlot) {
      const slot = activeScheduleSlot;
      if (slot.source.type === 'collection') {
        filtered = rawNfts.filter(n => !hiddenIds.has(n.tokenId) && n.collectionName === (slot.source as { type: 'collection'; name: string }).name);
      } else if (slot.source.type === 'playlist') {
        const playlists = loadPlaylists(walletAddress);
        const pl = playlists.find(p => p.id === (slot.source as any).id);
        if (pl) {
          const plSet = new Set(pl.items);
          filtered = rawNfts.filter(n => !hiddenIds.has(n.tokenId) && plSet.has(n.tokenId));
        }
      }
    }
    const ordered = [
      ...filtered.filter(n => pinnedIds.has(n.tokenId)),
      ...filtered.filter(n => !pinnedIds.has(n.tokenId)),
    ];
    return isShuffle ? shuffleArray(ordered) : ordered;
  }, [rawNfts, hiddenIds, pinnedIds, selectedCollection, isShuffle, shuffleSeed, activePlaylist, activeScheduleSlot, walletAddress]);

  const collectionStats = useMemo(() => {
    const colSet = new Set(nfts.map(n => n.collectionName));
    return { total: nfts.length, collections: colSet.size };
  }, [nfts]);

  // Reset index
  useEffect(() => {
    if (currentIndex >= nfts.length && nfts.length > 0) setCurrentIndex(0);
  }, [nfts.length, currentIndex]);

  const currentNFT = nfts[currentIndex];
  const currentSpeed = SPEED_PRESETS[speed].value;
  const isCurrentPixelArt = usePixelArtDetection(currentNFT);
  const currentOrientation = useOrientationDetection(currentNFT);

  // Preload upcoming images
  useImagePreloader(nfts, currentIndex, 3);

  // Track collection transitions for grouping indicator
  const prevCollectionRef = useRef<string>('');
  const [showCollectionBanner, setShowCollectionBanner] = useState(false);

  // Extract bg color
  useEffect(() => {
    if (currentNFT?.imageUrl) extractDominantColor(currentNFT.imageUrl).then(setBgColor);
    setExpandedDesc(false);

    // Show collection banner when collection changes
    if (currentNFT?.collectionName && currentNFT.collectionName !== prevCollectionRef.current) {
      if (prevCollectionRef.current !== '') { // Don't show on first load
        setShowCollectionBanner(true);
        setTimeout(() => setShowCollectionBanner(false), 2500);
      }
      prevCollectionRef.current = currentNFT.collectionName;
    }
  }, [currentNFT?.imageUrl, currentNFT?.collectionName]);

  // Dark mode class on body
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Save preferences on change
  useEffect(() => {
    savePrefs(walletAddress, { speed, transition, bgMode, customBgColor, showMetadata, isShuffle });
  }, [walletAddress, speed, transition, bgMode, customBgColor, showMetadata, isShuffle]);

  // ── Remote host ──────────────────────────────────────────
  useEffect(() => {
    const host = new RemoteHost(roomCode, (cmd: RemoteCommand) => {
      switch (cmd.type) {
        case 'next': goToNext(); break;
        case 'prev': goToPrevious(); break;
        case 'play': setIsPlaying(true); break;
        case 'pause': setIsPlaying(false); break;
        case 'toggle-play': setIsPlaying(p => !p); break;
        case 'toggle-info': setShowMetadata(p => !p); break;
        case 'toggle-shuffle': setIsShuffle(p => !p); setShuffleSeed(s => s + 1); setCurrentIndex(0); break;
        case 'toggle-fullscreen': toggleFullscreen(); break;
        case 'go-to': if (cmd.index >= 0 && cmd.index < nfts.length) setCurrentIndex(cmd.index); break;
        case 'set-speed': if (cmd.speed in SPEED_PRESETS) setSpeed(cmd.speed as keyof typeof SPEED_PRESETS); break;
        case 'ping':
          // Respond with state
          host.sendState({
            currentIndex,
            total: nfts.length,
            isPlaying,
            currentName: currentNFT?.name || '',
            currentCollection: currentNFT?.collectionName || '',
            currentImage: currentNFT?.imageUrl || '',
            speed,
            walletAddress,
          });
          break;
      }
    });
    remoteHostRef.current = host;
    return () => host.destroy();
  }, [roomCode]);

  // Send state updates to remote whenever key state changes
  useEffect(() => {
    remoteHostRef.current?.sendState({
      currentIndex,
      total: nfts.length,
      isPlaying,
      currentName: currentNFT?.name || '',
      currentCollection: currentNFT?.collectionName || '',
      currentImage: currentNFT?.imageUrl || '',
      speed,
      walletAddress,
    });
  }, [currentIndex, isPlaying, nfts.length, speed, currentNFT?.name]);

  // ── Schedule polling ─────────────────────────────────────
  useEffect(() => {
    const schedule = loadSchedule(walletAddress);
    if (!schedule.enabled) { setActiveScheduleSlot(null); return; }
    const check = () => {
      const slot = getActiveSlot(schedule);
      setActiveScheduleSlot(slot);
    };
    check();
    const interval = setInterval(check, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [walletAddress]);

  // ── Walkthrough trigger on first load ────────────────────
  useEffect(() => {
    const seen = localStorage.getItem('distoken:walkthrough-seen') === 'true';
    if (!seen) setShowWalkthrough(true);
  }, []);

  const formatAddress = (address: string) => {
    if (address.includes('.eth') || address.includes('.sol')) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // ── Curation handlers ────────────────────────────────────
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

  // ── Navigation ───────────────────────────────────────────
  const goToNext = useCallback(() => setCurrentIndex(prev => (prev + 1) % nfts.length), [nfts.length]);
  const goToPrevious = useCallback(() => setCurrentIndex(prev => (prev - 1 + nfts.length) % nfts.length), [nfts.length]);
  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(p => {
      const next = !p;
      // Use browser Fullscreen API for true device fullscreen
      if (next) {
        const el = containerRef.current || document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
      } else {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else if ((document as any).webkitFullscreenElement) (document as any).webkitExitFullscreen();
      }
      return next;
    });
  }, []);
  const toggleMetadata = useCallback(() => { setShowMetadata(p => !p); setExpandedDesc(false); }, []);
  const toggleMute = useCallback(() => setIsMuted(p => !p), []);
  const toggleShuffle = useCallback(() => {
    setIsShuffle(p => !p);
    setShuffleSeed(s => s + 1);
    setCurrentIndex(0);
  }, []);
  const copyShareUrl = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Download current NFT image at full resolution
  const downloadCurrentNFT = useCallback(async () => {
    if (!currentNFT?.imageUrl) return;
    try {
      const res = await fetch(currentNFT.imageUrl, { mode: 'cors' });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('gif') ? 'gif' : 'jpg';
      a.download = `${(currentNFT.name || currentNFT.tokenId).replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // CORS blocked — fallback to opening in new tab
      window.open(currentNFT.imageUrl, '_blank');
    }
  }, [currentNFT]);

  // Ambient mode = slow speed + no metadata + fullscreen
  const isAmbient = speed === 'ambient';

  const handleVideoEnd = useCallback(() => {
    if (isPlaying && nfts.length > 1) goToNext();
  }, [isPlaying, nfts.length, goToNext]);

  // Auto-advance
  useEffect(() => {
    if (!isPlaying || nfts.length <= 1) return;
    if (currentNFT?.mediaType === 'video') return; // Video handles its own advance
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % nfts.length), currentSpeed);
    return () => clearInterval(timer);
  }, [isPlaying, nfts.length, currentSpeed, currentNFT?.mediaType]);

  // Sync with browser fullscreen state (e.g. user presses Esc natively)
  useEffect(() => {
    const h = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', h);
    document.addEventListener('webkitfullscreenchange', h);
    return () => {
      document.removeEventListener('fullscreenchange', h);
      document.removeEventListener('webkitfullscreenchange', h);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!isSettingsOpen && !isFilterOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (isSettingsOpen && !t.closest('[data-settings-button]') && !t.closest('[data-settings-dropdown]')) { setIsSettingsOpen(false); setIsBgPickerOpen(false); }
      if (isFilterOpen && !t.closest('[data-filter-button]') && !t.closest('[data-filter-dropdown]')) setIsFilterOpen(false);
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', h), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', h); };
  }, [isSettingsOpen, isFilterOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "f" || e.key === "F") toggleFullscreen();
      if (e.key === "i" || e.key === "I") toggleMetadata();
      if (e.key === "m" || e.key === "M") toggleMute();
      if (e.key === "d" || e.key === "D") setIsDarkMode(p => !p);
      if (e.key === "s" || e.key === "S") { setIsShuffle(p => !p); setShuffleSeed(s => s + 1); setCurrentIndex(0); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [goToNext, goToPrevious, togglePlay, toggleFullscreen, toggleMetadata, toggleMute]);

  // Cursor hide in fullscreen/kiosk
  useEffect(() => {
    if (!kioskMode && !isFullscreen) return;
    let timeout: ReturnType<typeof setTimeout>;
    const hide = () => { document.body.style.cursor = 'none'; };
    const show = () => { document.body.style.cursor = 'auto'; clearTimeout(timeout); timeout = setTimeout(hide, 3000); };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('mousedown', show);
    return () => { clearTimeout(timeout); document.body.style.cursor = 'auto'; window.removeEventListener('mousemove', show); window.removeEventListener('mousedown', show); };
  }, [kioskMode, isFullscreen]);

  if (!currentNFT) return null;

  const txn = TRANSITIONS[transition];
  const maxStyleNormal: React.CSSProperties = { maxWidth: 'calc(100vw - 4rem)', maxHeight: 'calc(100vh - 350px)', width: 'auto', height: 'auto' };
  const maxStyleFS: React.CSSProperties = { maxWidth: '90vw', maxHeight: '90vh', width: 'auto', height: 'auto' };

  // ── Shared UI pieces ─────────────────────────────────────

  const renderSettingsDropdown = () => (
    <div className="absolute bottom-full right-0 mb-2 w-72 p-2 rounded-md border bg-white text-black border-black/20 shadow-lg z-50 max-h-[70vh] overflow-auto" data-settings-dropdown>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-black/60 px-2 py-1">Speed</p>
        {Object.entries(SPEED_PRESETS).map(([key, { label }]) => (
          <button key={key} onClick={() => { setSpeed(key as keyof typeof SPEED_PRESETS); setIsSettingsOpen(false); }}
            className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${speed === key ? "bg-black text-white font-medium" : "hover:bg-black/10"}`}>
            {label}
          </button>
        ))}

        <div className="border-t border-black/10 mt-1 pt-1">
          <p className="text-xs font-semibold text-black/60 px-2 py-1">Transition</p>
          {(['fade', 'slide', 'zoom', 'crossfade'] as TransitionType[]).map(t => (
            <button key={t} onClick={() => { setTransition(t); setIsSettingsOpen(false); }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors capitalize ${transition === t ? "bg-black text-white font-medium" : "hover:bg-black/10"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="border-t border-black/10 mt-1 pt-1">
          <p className="text-xs font-semibold text-black/60 px-2 py-1">Background</p>
          {(Object.entries(BG_PRESETS) as [BackgroundMode, { label: string; desc: string }][]).map(([key, { label, desc }]) => (
            <button key={key} onClick={() => {
              setBgMode(key);
              if (key === 'custom') { setIsBgPickerOpen(true); } else { setIsSettingsOpen(false); }
            }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${bgMode === key ? "bg-black text-white font-medium" : "hover:bg-black/10"}`}>
              <span>{label}</span>
              <span className={`block text-xs ${bgMode === key ? 'text-white/60' : 'text-black/40'}`}>{desc}</span>
            </button>
          ))}
          {bgMode === 'custom' && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <input type="color" value={customBgColor} onChange={e => setCustomBgColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0" />
              <span className="text-xs text-black/60">{customBgColor}</span>
            </div>
          )}
        </div>

        {hiddenIds.size > 0 && (
          <div className="border-t border-black/10 mt-1 pt-1">
            <button onClick={() => { setHiddenIds(new Set()); saveSet(curKey(walletAddress, 'hidden'), new Set()); setIsSettingsOpen(false); }}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-black/10 flex items-center gap-2 text-red-600">
              <Undo2 className="h-3.5 w-3.5" /> Restore {hiddenIds.size} hidden
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderFilterDropdown = () => (
    <div className="absolute bottom-full right-0 mb-2 w-64 p-2 rounded-md border bg-white text-black border-black/20 shadow-lg z-50 max-h-80 overflow-auto" data-filter-dropdown>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-black/60 px-2 py-1">Filter by Collection</p>
        <button onClick={() => { setSelectedCollection(null); setIsFilterOpen(false); }}
          className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${!selectedCollection ? "bg-black text-white font-medium" : "hover:bg-black/10"}`}>
          All ({rawNfts.filter(n => !hiddenIds.has(n.tokenId)).length})
        </button>
        {collections.map(name => {
          const count = rawNfts.filter(n => n.collectionName === name && !hiddenIds.has(n.tokenId)).length;
          return (
            <button key={name} onClick={() => { setSelectedCollection(name); setIsFilterOpen(false); setCurrentIndex(0); }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors truncate ${selectedCollection === name ? "bg-black text-white font-medium" : "hover:bg-black/10"}`}>
              {name} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderControls = (dark: boolean) => {
    const btn = dark
      ? "border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
      : "border-border/50 hover:bg-accent";
    const txt = dark ? 'text-white/70' : 'text-muted-foreground';
    return (
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        {/* Stats */}
        <span className={`text-xs font-light ${txt} hidden md:inline`}>
          {collectionStats.total} NFTs · {collectionStats.collections} collection{collectionStats.collections !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-light ${txt}`}>{currentIndex + 1}</span>
          <div className={`w-20 h-px ${dark ? 'bg-white/30' : 'bg-border'}`}>
            <div className={`h-full transition-all duration-300 ${dark ? 'bg-white' : 'bg-foreground'}`}
              style={{ width: `${((currentIndex + 1) / nfts.length) * 100}%` }} />
          </div>
          <span className={`text-sm font-light ${txt}`}>{nfts.length}</span>
        </div>
        <Button variant="outline" size="icon" onClick={togglePlay} className={`${btn} h-9 w-9 rounded-full`}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={toggleShuffle}
          className={`${btn} h-9 w-9 rounded-full ${isShuffle ? 'ring-1 ring-white/40' : ''}`} title="Shuffle (S)">
          <Shuffle className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={toggleMetadata}
          className={`${btn} h-9 w-9 rounded-full ${showMetadata ? 'ring-1 ring-white/40' : ''}`} title="Info (I)">
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={toggleMute}
          className={`${btn} h-9 w-9 rounded-full`} title="Mute (M)">
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        {collections.length > 1 && (
          <div className="relative">
            <Button variant="outline" size="icon" onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`${btn} h-9 w-9 rounded-full ${selectedCollection ? 'ring-1 ring-white/40' : ''}`} data-filter-button>
              <Filter className="h-4 w-4" />
            </Button>
            {isFilterOpen && renderFilterDropdown()}
          </div>
        )}
        <Button variant="outline" size="icon" onClick={() => { setIsGalleryOpen(!isGalleryOpen); setShowGalleryHeader(true); }}
          className={`${btn} h-9 w-9 rounded-full`}>
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <div className="relative">
          <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`${btn} h-9 w-9 rounded-full`} data-settings-button>
            <Settings className="h-4 w-4" />
          </Button>
          {isSettingsOpen && renderSettingsDropdown()}
        </div>
        <Button variant="outline" size="icon" onClick={() => setIsDarkMode(!isDarkMode)}
          className={`${btn} h-9 w-9 rounded-full`} title="Theme (D)">
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => setIsPlaylistOpen(true)}
          className={`${btn} h-9 w-9 rounded-full ${activePlaylist ? 'ring-1 ring-white/40' : ''}`} title="Playlists">
          <List className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setIsRemoteOpen(true)}
          className={`${btn} h-9 w-9 rounded-full`} title="Phone Remote">
          <Smartphone className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={copyShareUrl}
          className={`${btn} h-9 w-9 rounded-full ${copied ? 'ring-1 ring-green-400' : ''}`} title="Copy share link">
          <Copy className={`h-4 w-4 ${copied ? 'text-green-400' : ''}`} />
        </Button>
        <Button variant="outline" size="icon" onClick={downloadCurrentNFT}
          className={`${btn} h-9 w-9 rounded-full`} title="Download current NFT">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => { setWalkthroughForce(true); setShowWalkthrough(true); }}
          className={`${btn} h-9 w-9 rounded-full`} title="Feature tour">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={toggleFullscreen} className={`${btn} h-9 w-9 rounded-full`}>
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
    );
  };

  const renderMetadata = (dark: boolean) => {
    // Always render the container at fixed height to prevent layout shift
    return (
      <div className="flex-1 min-w-0" style={{ minHeight: showMetadata ? 'auto' : 0, visibility: showMetadata ? 'visible' : 'hidden', overflow: 'hidden', maxHeight: showMetadata ? 200 : 0, transition: 'max-height 0.2s ease, opacity 0.2s ease', opacity: showMetadata ? 1 : 0 }}>
        <div className="space-y-1">
          <h2 className={`text-xl md:text-2xl font-medium tracking-tight truncate ${dark ? 'text-white' : ''}`}>
            {currentNFT.name || `#${currentNFT.tokenId}`}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-light ${dark ? 'text-white/70' : 'text-muted-foreground'}`}>
              {currentNFT.collectionName || "Unknown Collection"}
            </p>
            {currentNFT.mediaType === 'video' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-white/10 border border-white/20 text-white/80' : 'bg-muted border border-border text-muted-foreground'}`}>▶ Video</span>
            )}
            {currentNFT.mediaType === 'audio' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-white/10 border border-white/20 text-white/80' : 'bg-muted border border-border text-muted-foreground'}`}>♪ Audio</span>
            )}
            {isCurrentPixelArt && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-white/10 border border-white/20 text-white/80' : 'bg-muted border border-border text-muted-foreground'}`}>▦ Pixel Art</span>
            )}
            {currentNFT.mediaType === 'html' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-white/10 border border-white/20 text-white/80' : 'bg-muted border border-border text-muted-foreground'}`}>⟨/⟩ Generative</span>
            )}
            {currentOrientation === 'portrait' && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${dark ? 'bg-white/10 border border-white/20 text-white/80' : 'bg-muted border border-border text-muted-foreground'}`}>↕ Portrait</span>
            )}
          </div>
          {currentNFT.description && (
            <p
              className={`text-sm font-light max-w-2xl cursor-pointer ${expandedDesc ? '' : 'line-clamp-2'} ${dark ? 'text-white/50 hover:text-white/70' : 'text-muted-foreground/70 hover:text-muted-foreground'}`}
              onClick={() => setExpandedDesc(p => !p)}
              title={expandedDesc ? 'Click to collapse' : 'Click to expand'}
            >
              {currentNFT.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderArrows = (dark: boolean) => {
    if (nfts.length <= 1) return null;
    const cls = dark
      ? "border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
      : "border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent";
    return (
      <>
        <Button variant="outline" size="icon" onClick={goToPrevious}
          className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 ${cls} h-10 w-10 md:h-12 md:w-12 rounded-full shadow-refined z-20`}>
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
        <Button variant="outline" size="icon" onClick={goToNext}
          className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 ${cls} h-10 w-10 md:h-12 md:w-12 rounded-full shadow-refined z-20`}>
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
      </>
    );
  };

  // ── Gallery popover ──────────────────────────────────────
  const renderGallery = () => (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setIsGalleryOpen(false)}>
      <div className="bg-background border border-border/30 rounded-lg shadow-refined max-w-6xl w-full max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
        onScroll={e => setShowGalleryHeader(e.currentTarget.scrollTop < 50)}>
        <div className={`sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/30 p-4 flex items-center justify-between transition-all duration-300 ${showGalleryHeader ? '' : '-translate-y-full opacity-0'}`}>
          <h3 className="text-lg font-medium tracking-tight">
            {formatAddress(walletAddress)} · {collectionStats.total} NFTs
            {selectedCollection && <span className="text-sm font-light text-muted-foreground ml-2">— {selectedCollection}</span>}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setIsGalleryOpen(false)} className="border-border/50 hover:bg-accent font-light">Close</Button>
        </div>
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {nfts.map((nft, index) => (
              <div key={`${nft.contractAddress}-${nft.tokenId}`} className="relative group/card">
                <button onClick={() => { setCurrentIndex(index); setIsPlaying(false); setIsGalleryOpen(false); }}
                  className={`w-full relative transition-all duration-300 rounded-lg ${index === currentIndex ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'hover:scale-105'}`}>
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {nft.imageUrl ? (
                      <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                    {nft.mediaType === 'video' && <div className="absolute top-1 left-1 text-xs px-1 py-0.5 rounded bg-black/60 text-white">▶</div>}
                    {nft.mediaType === 'audio' && <div className="absolute top-1 left-1 text-xs px-1 py-0.5 rounded bg-black/60 text-white">♪</div>}
                    <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-1.5">
                        <p className="text-white text-xs font-light line-clamp-2">{nft.name || `#${nft.tokenId}`}</p>
                      </div>
                    </div>
                  </div>
                </button>
                <div className="absolute top-1 right-1 gap-1 hidden group-hover/card:flex z-10">
                  <button onClick={() => togglePin(nft.tokenId)} className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/90">
                    <Pin className={`h-2.5 w-2.5 ${pinnedIds.has(nft.tokenId) ? 'text-yellow-400' : 'text-white'}`} />
                  </button>
                  <AddToPlaylistButton walletAddress={walletAddress} tokenId={nft.tokenId} className="scale-[0.625] origin-top-right -mr-1.5 -mt-1.5" />
                  <button onClick={() => toggleHide(nft.tokenId)} className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-600">
                    <EyeOff className="h-2.5 w-2.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {hiddenIds.size > 0 && (
            <div className="mt-8 border-t border-border/30 pt-6">
              <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Hidden ({hiddenIds.size})</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {rawNfts.filter(n => hiddenIds.has(n.tokenId)).map(nft => (
                  <div key={nft.tokenId} className="relative group/card opacity-40 hover:opacity-80 transition-opacity">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      {nft.imageUrl && <img src={nft.imageUrl} alt="" className="w-full h-full object-cover grayscale" loading="lazy" />}
                    </div>
                    <button onClick={() => toggleHide(nft.tokenId)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-green-600">
                      <Undo2 className="h-2.5 w-2.5 text-white" />
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

  // ════════════════════════════════════════════════════════════
  // FULLSCREEN / KIOSK
  // ════════════════════════════════════════════════════════════
  if (isFullscreen || kioskMode) {
    return (
      <>
        <div ref={containerRef} className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden"
          onMouseMove={() => {
            setShowFullscreenControls(true);
            if (fullscreenTimeoutRef.current) clearTimeout(fullscreenTimeoutRef.current);
            fullscreenTimeoutRef.current = setTimeout(() => {
              if (!isSettingsOpen && !isFilterOpen) setShowFullscreenControls(false);
            }, isAmbient ? 1500 : kioskMode ? 2000 : 2500);
          }}>
          <BlurredBackground src={currentNFT.imageUrl} fallbackColor={bgColor} mode={bgMode} customColor={customBgColor} />
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex} {...txn}
              className="relative z-10 w-full h-full flex items-center justify-center p-6 md:p-8">
              <NFTMedia nft={currentNFT} maxStyle={maxStyleFS} className="rounded-lg shadow-2xl"
                onVideoEnd={handleVideoEnd} isPixelArt={isCurrentPixelArt} isMuted={isMuted} onToggleMute={toggleMute} />
            </motion.div>
          </AnimatePresence>

          {/* Controls overlay */}
          <div className="absolute inset-0 z-20">
            <motion.div animate={{ opacity: showFullscreenControls ? 1 : 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.5) 100%)' }} />
            <motion.div animate={{ opacity: showFullscreenControls ? 1 : 0 }} transition={{ duration: 0.3 }}
              style={{ pointerEvents: showFullscreenControls ? 'auto' : 'none' }} className="absolute inset-0">
              {/* Top */}
              <div className="absolute top-0 left-0 right-0 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-sm md:text-base font-medium text-white">{formatAddress(walletAddress)}</h1>
                    {chain && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
                        style={chain === 'solana'
                          ? { background: 'rgba(153,69,255,0.2)', borderColor: 'rgba(153,69,255,0.5)', color: '#C084FC' }
                          : { background: 'rgba(98,126,234,0.2)', borderColor: 'rgba(98,126,234,0.5)', color: '#93A8F4' }}>
                        {chain === 'solana' ? '◎ Solana' : 'Ξ Ethereum'}
                      </span>
                    )}
                    {selectedCollection && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-white/30 text-white/80 bg-white/10">{selectedCollection}</span>
                    )}
                    {activePlaylist && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-purple-400/50 text-purple-200 bg-purple-500/20">📋 {activePlaylist.name}</span>
                    )}
                    {activeScheduleSlot && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400/50 text-amber-200 bg-amber-500/20">🕐 {activeScheduleSlot.label}</span>
                    )}
                  </div>
                  <Button onClick={() => setIsFullscreen(false)} variant="outline" size="sm"
                    className="border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm font-light">
                    <Minimize className="h-4 w-4 mr-2" />{kioskMode ? 'Exit Kiosk' : 'Exit'}
                  </Button>
                </div>
              </div>
              {renderArrows(true)}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                  {renderMetadata(true)}
                  {renderControls(true)}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Collection transition banner */}
          <AnimatePresence>
            {showCollectionBanner && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-20 left-0 right-0 z-30 flex justify-center pointer-events-none"
              >
                <div className="bg-black/50 backdrop-blur-md rounded-full px-6 py-2 border border-white/10">
                  <p className="text-sm font-medium text-white/90 tracking-wide">
                    {currentNFT.collectionName || 'Unknown Collection'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent subtle metadata in kiosk when controls hidden */}
          {kioskMode && showMetadata && !showFullscreenControls && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute bottom-0 left-0 right-0 z-20 p-6"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
              <h2 className="text-xl font-medium text-white">{currentNFT.name || `#${currentNFT.tokenId}`}</h2>
              <p className="text-sm text-white/60 font-light">{currentNFT.collectionName || "Unknown"}</p>
            </motion.div>
          )}
        </div>
        {isGalleryOpen && renderGallery()}
        <PlaylistManager
          walletAddress={walletAddress}
          nfts={rawNfts}
          onSelectPlaylist={(pl) => { setActivePlaylist(pl); setCurrentIndex(0); }}
          activePlaylistId={activePlaylist?.id ?? null}
          isOpen={isPlaylistOpen}
          onClose={() => setIsPlaylistOpen(false)}
        />
        <RemoteQROverlay
          roomCode={roomCode}
          baseUrl={window.location.origin}
          isOpen={isRemoteOpen}
          onClose={() => setIsRemoteOpen(false)}
        />
        {showWalkthrough && (
          <Walkthrough
            force={walkthroughForce}
            onComplete={() => { setShowWalkthrough(false); setWalkthroughForce(false); }}
          />
        )}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════
  // NORMAL MODE
  // ════════════════════════════════════════════════════════════
  return (
    <>
      <div className="relative w-full h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="container py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <h1 className="text-sm md:text-base font-light tracking-tight truncate">
                  <span className="font-medium">{formatAddress(walletAddress)}</span>
                  <span className="text-muted-foreground ml-2 text-xs hidden md:inline">
                    {collectionStats.total} NFTs · {collectionStats.collections} collection{collectionStats.collections !== 1 ? 's' : ''}
                  </span>
                </h1>
                {chain && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full border shrink-0"
                    style={chain === 'solana'
                      ? { background: 'rgba(153,69,255,0.12)', borderColor: 'rgba(153,69,255,0.35)', color: '#9945FF' }
                      : { background: 'rgba(98,126,234,0.12)', borderColor: 'rgba(98,126,234,0.35)', color: '#627EEA' }}>
                    {chain === 'solana' ? '◎ Solana' : 'Ξ Ethereum'}
                  </span>
                )}
                {selectedCollection && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground shrink-0">
                    {selectedCollection}
                    <button onClick={() => setSelectedCollection(null)} className="ml-1.5 hover:text-foreground">×</button>
                  </span>
                )}
                {activePlaylist && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shrink-0">
                    📋 {activePlaylist.name}
                    <button onClick={() => { setActivePlaylist(null); setCurrentIndex(0); }} className="ml-1.5 hover:text-purple-900 dark:hover:text-purple-100">×</button>
                  </span>
                )}
                {activeScheduleSlot && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
                    🕐 {activeScheduleSlot.label}
                  </span>
                )}
              </div>
              {onChangeWallet && (
                <Button onClick={onChangeWallet} variant="outline" size="sm" className="border-border/50 hover:bg-accent font-light shrink-0">
                  Change Wallet
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main display area */}
        <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
          <BlurredBackground src={currentNFT.imageUrl} fallbackColor={bgColor} mode={bgMode} customColor={customBgColor} />
          <div className="relative z-10 w-full h-full flex items-center justify-center px-4 md:px-8 py-6 md:py-8">
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex} {...txn}
                className="w-full h-full flex items-center justify-center">
                <div className="relative max-w-full max-h-full group/nft"
                  onMouseEnter={() => setHoveredNFT(currentNFT.tokenId)}
                  onMouseLeave={() => setHoveredNFT(null)}
                  style={{ overflow: 'hidden', borderRadius: 8 }}>
                  <NFTMedia nft={currentNFT} maxStyle={maxStyleNormal} className="shadow-refined rounded-lg"
                    onVideoEnd={handleVideoEnd} isPixelArt={isCurrentPixelArt} isMuted={isMuted} onToggleMute={toggleMute} />
                  <div className="absolute inset-0 rounded-lg border border-white/10 pointer-events-none" />
                  {hoveredNFT === currentNFT.tokenId && (
                    <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                      <button onClick={() => togglePin(currentNFT.tokenId)}
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/80">
                        <Pin className={`h-3.5 w-3.5 ${pinnedIds.has(currentNFT.tokenId) ? 'text-yellow-400' : 'text-white'}`} />
                      </button>
                      <button onClick={() => toggleHide(currentNFT.tokenId)}
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-red-600/80">
                        <EyeOff className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            {renderArrows(false)}

            {/* Collection transition banner (normal mode) */}
            <AnimatePresence>
              {showCollectionBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-6 left-0 right-0 z-30 flex justify-center pointer-events-none"
                >
                  <div className="bg-black/50 backdrop-blur-md rounded-full px-6 py-2 border border-white/10">
                    <p className="text-sm font-medium text-white/90 tracking-wide">
                      {currentNFT.collectionName || 'Unknown Collection'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom panel */}
        <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="container py-4 md:py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {renderMetadata(false)}
              {renderControls(false)}
            </div>
          </div>
        </div>
      </div>
      {isGalleryOpen && renderGallery()}
      <PlaylistManager
        walletAddress={walletAddress}
        nfts={rawNfts}
        onSelectPlaylist={(pl) => { setActivePlaylist(pl); setCurrentIndex(0); }}
        activePlaylistId={activePlaylist?.id ?? null}
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
      />
      <RemoteQROverlay
        roomCode={roomCode}
        baseUrl={window.location.origin}
        isOpen={isRemoteOpen}
        onClose={() => setIsRemoteOpen(false)}
      />
      {showWalkthrough && (
        <Walkthrough
          force={walkthroughForce}
          onComplete={() => { setShowWalkthrough(false); setWalkthroughForce(false); }}
        />
      )}
    </>
  );
}
