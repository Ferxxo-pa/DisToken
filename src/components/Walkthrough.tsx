import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Filter, Fullscreen,
  LayoutGrid, List, Monitor, Palette, Play, QrCode,
  Shuffle, Smartphone, X,
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
    description: "The best way to display your NFTs on any screen. No app to install, no hardware to buy — just a URL that turns any device into a gallery.",
    icon: <Monitor className="h-8 w-8" />,
  },
  {
    title: "Slideshow Controls",
    description: "Navigate through your collection with arrow keys, pause/play, and control the slideshow speed. Your NFTs auto-advance so you can sit back and enjoy.",
    icon: <Play className="h-8 w-8" />,
    shortcut: "← → Space",
    tip: "Press Space to pause, arrow keys to navigate",
  },
  {
    title: "Fullscreen & Kiosk Mode",
    description: "Go fullscreen for an immersive gallery experience. Add ?mode=kiosk to the URL for zero-chrome display — perfect for TVs and digital frames.",
    icon: <Fullscreen className="h-8 w-8" />,
    shortcut: "F",
    tip: "Controls auto-hide after a few seconds in fullscreen",
  },
  {
    title: "Curate Your Gallery",
    description: "Pin your favorites to show first, hide NFTs you don't want to display, and filter by collection. Open the gallery grid to browse and jump to any piece.",
    icon: <LayoutGrid className="h-8 w-8" />,
    shortcut: "I S",
    tip: "Hover over artwork to see pin/hide controls",
  },
  {
    title: "Playlists",
    description: "Create named playlists like \"Living Room Rotation\" or \"Gallery Night\". Drag your favorite pieces into curated shows and share them via URL.",
    icon: <List className="h-8 w-8" />,
    tip: "Add NFTs to playlists from the gallery grid",
  },
  {
    title: "Background & Themes",
    description: "Choose from 5 background modes: blurred artwork fill, dark, light, color-matched, or a custom color. Switch between dark and light themes anytime.",
    icon: <Palette className="h-8 w-8" />,
    shortcut: "D",
    tip: "Blur mode samples colors from the artwork edges for ambient backgrounds",
  },
  {
    title: "Shuffle & Speed",
    description: "Randomize your display order with shuffle mode. Pick from 5 speed presets — Ambient (15s) for 24/7 displays down to Very Fast (1.5s) for quick browsing.",
    icon: <Shuffle className="h-8 w-8" />,
    shortcut: "S",
  },
  {
    title: "Phone Remote",
    description: "Control your TV display from your phone. Scan the QR code shown on your TV to get a mobile remote — no app needed, works right in the browser.",
    icon: <QrCode className="h-8 w-8" />,
    tip: "Open on any device connected to the same network",
  },
  {
    title: "Multi-Chain, Multi-Wallet",
    description: "Enter any Ethereum (0x…, .eth) or Solana address (.sol). Comma-separate addresses to merge multiple wallets into one gallery.",
    icon: <Filter className="h-8 w-8" />,
    tip: "Works with ENS names and Bonfida .sol domains too",
  },
  {
    title: "Display on Any Screen",
    description: "Samsung TV, Apple TV, Fire Stick, Chromecast, Raspberry Pi — we've got setup guides for every device. Check the 📺 Display on a TV link on the home page.",
    icon: <Smartphone className="h-8 w-8" />,
    tip: "HDMI gives the best quality — no wireless compression",
  },
];

interface WalkthroughProps {
  onComplete: () => void;
  /** Force show even if already seen (e.g., from settings) */
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

  // Keyboard navigation
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
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
        >
          <X className="h-4 w-4 text-black/60 dark:text-white/60" />
        </button>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
          <motion.div
            className="h-full bg-black dark:bg-white"
            initial={false}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>

        {/* Content */}
        <div className="p-8 pt-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-6"
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-black/80 dark:text-white/80">
                {step.icon}
              </div>

              {/* Text */}
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white">
                  {step.title}
                </h2>
                <p className="text-sm leading-relaxed text-black/60 dark:text-white/60 font-light">
                  {step.description}
                </p>
              </div>

              {/* Shortcut badge + tip */}
              <div className="space-y-2">
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
                  <p className="text-xs text-black/40 dark:text-white/40 italic flex items-start gap-1.5">
                    <span className="not-italic">💡</span> {step.tip}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFirst ? (
              <button
                onClick={handleSkip}
                className="text-sm text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors font-light"
              >
                Skip tour
              </button>
            ) : (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>

          {/* Dots */}
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
            {isLast ? (
              <>Start Exploring</>
            ) : (
              <>Next <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** Small "?" button to re-trigger walkthrough from anywhere */
export function WalkthroughTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
      title="Show feature tour"
    >
      <span className="text-xs font-semibold text-black/50 dark:text-white/50">?</span>
    </button>
  );
}
