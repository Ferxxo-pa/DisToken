import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Filter, Frame, Fullscreen,
  LayoutGrid, List, Monitor, Palette, Play, QrCode,
  Shuffle, Smartphone, X, ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = 'distoken:walkthrough-seen';

function hasSeenWalkthrough(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markWalkthroughSeen() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
  shortcut?: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to DisToken",
    description: "Display your NFTs on any screen. No app, no hardware — just a URL. Works with Ethereum and Solana.",
    icon: <Monitor className="h-8 w-8" />,
  },
  {
    title: "Controls",
    description: "Play/pause, fullscreen, and gallery grid are always visible. Everything else is in the ⚙ settings button. Swipe or use arrow keys to navigate.",
    icon: <Play className="h-8 w-8" />,
    shortcut: "← → Space",
  },
  {
    title: "Settings",
    description: "Tap ⚙ to open settings. Three sections: Display (speed, backgrounds, frames), Curation (filters, playlists, shuffle), and Tools (remote, embed, kiosk link).",
    icon: <Palette className="h-8 w-8" />,
  },
  {
    title: "Backgrounds & Frames",
    description: "5 backgrounds: blur, dark, light, color-match, custom. 5 frames: none, minimal, gallery mat, modern shadow, ornate gold. Mix and match.",
    icon: <Frame className="h-8 w-8" />,
    shortcut: "D",
  },
  {
    title: "Speed",
    description: "5 presets from Ambient (15s) to Very Fast (1.5s). Or use the custom slider to set any speed from 1–30 seconds. 4 transition effects.",
    icon: <Shuffle className="h-8 w-8" />,
  },
  {
    title: "Curate",
    description: "Open the gallery grid to see everything. Pin favorites, hide what you don't want, filter by collection. Smart groups auto-sort by artist, chain, or media type.",
    icon: <LayoutGrid className="h-8 w-8" />,
  },
  {
    title: "Playlists",
    description: "Create playlists like \"Living Room\" or \"Gallery Night\". Add NFTs from the grid, switch between them anytime.",
    icon: <List className="h-8 w-8" />,
  },
  {
    title: "Zoom",
    description: "Click any artwork to zoom in. Scroll or pinch to magnify, drag to pan. Press Escape to exit.",
    icon: <ZoomIn className="h-8 w-8" />,
  },
  {
    title: "Phone Remote",
    description: "Control the TV from your phone. Settings → Tools → Phone Remote. Get a room code, open it on your phone — full control, no app needed.",
    icon: <QrCode className="h-8 w-8" />,
  },
  {
    title: "Kiosk & TV",
    description: "Add ?mode=kiosk to any URL for a zero-chrome display. Find the kiosk link in Settings → Tools. Works on Samsung, LG, Fire Stick, Chromecast, Apple TV, Roku, Raspberry Pi.",
    icon: <Fullscreen className="h-8 w-8" />,
    shortcut: "F",
  },
  {
    title: "Multi-Wallet",
    description: "Enter any ETH address, ENS name, Solana address, or .sol domain. Comma-separate to merge multiple wallets. Settings save per wallet.",
    icon: <Filter className="h-8 w-8" />,
  },
  {
    title: "More",
    description: "Embed your gallery on any website. Download NFTs at full resolution. Copy shareable links. Install as a PWA for native app feel.",
    icon: <Smartphone className="h-8 w-8" />,
  },
];

interface WalkthroughProps {
  onComplete: () => void;
  force?: boolean;
}

export function Walkthrough({ onComplete, force = false }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (force || !hasSeenWalkthrough()) {
      setIsVisible(true);
    } else {
      onComplete();
    }
  }, [force]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(s => s + 1);
    } else {
      handleClose();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(s => s - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    markWalkthroughSeen();
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    markWalkthroughSeen();
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isVisible, handleNext, handlePrev, handleSkip]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4 text-black/60 dark:text-white/60" />
        </button>

        <div className="absolute top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <motion.div
            className="h-full bg-black dark:bg-white"
            initial={false}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>

        <div className="p-8 pt-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-black/80 dark:text-white/80">
                {step.icon}
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-black dark:text-white">
                  {step.title}
                </h2>
                <p className="text-sm leading-relaxed text-black/60 dark:text-white/60 font-light">
                  {step.description}
                </p>
              </div>

              {step.shortcut && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-black/40 dark:text-white/40">Keyboard:</span>
                  <div className="flex gap-1">
                    {step.shortcut.split(' ').map((key, i) => (
                      <kbd key={i} className="px-2 py-1 text-xs font-mono rounded bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 border border-black/10 dark:border-white/10">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              )}
              {step.tip && (
                <p className="text-xs text-black/40 dark:text-white/40 italic">
                  💡 {step.tip}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-8 pb-8 flex items-center justify-between">
          <div>
            {isFirst ? (
              <button onClick={handleSkip} className="text-sm text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors font-light">
                Skip
              </button>
            ) : (
              <button onClick={handlePrev} className="flex items-center gap-1 text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > currentStep ? 1 : -1); setCurrentStep(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? 'w-4 bg-black dark:bg-white'
                    : 'bg-black/15 dark:bg-white/15 hover:bg-black/30 dark:hover:bg-white/30'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full hover:bg-black/80 dark:hover:bg-white/90 transition-colors"
          >
            {isLast ? 'Start' : <>Next <ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
