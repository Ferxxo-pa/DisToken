import type { Playlist } from "@/lib/playlists";
import type { AmbienceMode } from "@/components/AmbiencePlayer";
import { AMBIENCE_OPTIONS } from "@/components/AmbiencePlayer";
import type { AutoGroupKey } from "@/lib/autoCollections";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3, ChevronRight, Code2, Copy, Download, Filter, Frame,
  HelpCircle, LayoutGrid, List, Moon, Palette, Shuffle,
  Smartphone, Undo2, Volume2, X,
} from "lucide-react";
import { useState } from "react";

// ── Types shared with NFTSlideshow ─────────────────────────

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'crossfade';
export type BackgroundMode = 'blur' | 'dark' | 'light' | 'match' | 'custom';
export type FrameStyle = 'none' | 'minimal' | 'gallery' | 'modern' | 'ornate';
export type GridSize = 2 | 3 | 4;

export const SPEED_PRESETS = {
  ambient: { label: "Ambient", value: 15000 },
  slow: { label: "Slow", value: 8000 },
  normal: { label: "Normal", value: 5000 },
  fast: { label: "Fast", value: 3000 },
  veryFast: { label: "Very Fast", value: 1500 },
};

export const BG_PRESETS: Record<BackgroundMode, { label: string; desc: string }> = {
  blur: { label: 'Blur Fill', desc: 'Blurred artwork as ambient background' },
  dark: { label: 'Dark', desc: 'Pure black background' },
  light: { label: 'Light', desc: 'Clean white gallery wall' },
  match: { label: 'Match Color', desc: 'Solid color sampled from artwork' },
  custom: { label: 'Custom', desc: 'Choose your own color' },
};

export const FRAME_STYLES: Record<FrameStyle, { label: string; desc: string }> = {
  none: { label: 'None', desc: 'No frame' },
  minimal: { label: 'Minimal', desc: 'Thin dark border' },
  gallery: { label: 'Gallery', desc: 'White mat with frame' },
  modern: { label: 'Modern', desc: 'Floating shadow' },
  ornate: { label: 'Ornate', desc: 'Decorative gold border' },
};

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Display
  speed: keyof typeof SPEED_PRESETS;
  onSpeedChange: (speed: keyof typeof SPEED_PRESETS) => void;
  customSpeedMs: number;
  onCustomSpeedMsChange: (ms: number) => void;
  transition: TransitionType;
  onTransitionChange: (t: TransitionType) => void;
  bgMode: BackgroundMode;
  onBgModeChange: (m: BackgroundMode) => void;
  customBgColor: string;
  onCustomBgColorChange: (c: string) => void;
  frameStyle: FrameStyle;
  onFrameStyleChange: (f: FrameStyle) => void;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
  // Curation
  isShuffle: boolean;
  onShuffleToggle: () => void;
  showMetadata: boolean;
  onMetadataToggle: () => void;
  showPriceOverlay: boolean;
  onPriceOverlayToggle: () => void;
  // Collections & filters
  collections: string[];
  selectedCollection: string | null;
  onCollectionChange: (c: string | null) => void;
  autoGroups: { key: AutoGroupKey; label: string; count: number }[];
  activeAutoGroup: AutoGroupKey | null;
  onAutoGroupChange: (g: AutoGroupKey | null) => void;
  // Gallery wall
  isGalleryWallMode: boolean;
  onGalleryWallToggle: () => void;
  galleryWallSize: GridSize;
  onGalleryWallSizeChange: (s: GridSize) => void;
  // Playlist
  activePlaylist: Playlist | null;
  onPlaylistOpen: () => void;
  // Remote
  onRemoteOpen: () => void;
  // Embed
  onEmbedOpen: () => void;
  // Ambience
  ambienceMode: AmbienceMode;
  onAmbienceModeChange: (m: AmbienceMode) => void;
  // Analytics
  onAnalyticsOpen: () => void;
  // Walkthrough
  onWalkthroughOpen: () => void;
  // Download
  onDownload: () => void;
  // Copy share link
  onCopyLink: () => void;
  copied: boolean;
  // Hidden NFTs
  hiddenCount: number;
  onRestoreHidden: () => void;
  // Total NFTs
  totalNfts: number;
  totalCollections: number;
  walletAddress: string;
}

type Section = 'display' | 'curation' | 'tools' | null;

export function SettingsDrawer(props: SettingsDrawerProps) {
  const [expandedSection, setExpandedSection] = useState<Section>(null);

  if (!props.isOpen) return null;

  const toggleSection = (s: Section) => setExpandedSection(prev => prev === s ? null : s);

  const formatAddress = (a: string) => {
    if (a.includes('.eth') || a.includes('.sol')) return a;
    return `${a.slice(0, 6)}...${a.slice(-4)}`;
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/40"
        onClick={props.onClose}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-[90] w-80 max-w-[85vw] bg-white dark:bg-zinc-900 border-l border-black/10 dark:border-white/10 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-black/10 dark:border-white/10 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white">Settings</h2>
            <p className="text-xs text-black/40 dark:text-white/40 font-light">
              {formatAddress(props.walletAddress)} · {props.totalNfts} NFTs
            </p>
          </div>
          <button
            onClick={props.onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-black/60 dark:text-white/60" />
          </button>
        </div>

        {/* Feature Tour — top of drawer */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => { props.onWalkthroughOpen(); props.onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-black/5 to-black/10 dark:from-white/5 dark:to-white/10 hover:from-black/10 hover:to-black/15 dark:hover:from-white/10 dark:hover:to-white/15 transition-all border border-black/5 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center shrink-0">
              <HelpCircle className="h-5 w-5 text-white dark:text-black" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-black dark:text-white">Feature Tour</p>
              <p className="text-xs text-black/40 dark:text-white/40 font-light">Learn what DisToken can do</p>
            </div>
            <ChevronRight className="h-4 w-4 text-black/20 dark:text-white/20" />
          </button>
        </div>

        <div className="p-4 pt-2 space-y-1">
          {/* ── DISPLAY SECTION ─────────────────────────── */}
          <SectionButton
            icon={<Palette className="h-4 w-4" />}
            label="Display"
            desc="Speed, transitions, backgrounds, frames"
            isOpen={expandedSection === 'display'}
            onClick={() => toggleSection('display')}
          />
          <AnimatePresence>
            {expandedSection === 'display' && (
              <SectionContent>
                {/* Speed */}
                <SubLabel>Speed</SubLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(SPEED_PRESETS).map(([key, { label }]) => (
                    <OptionButton key={key} active={props.speed === key} onClick={() => props.onSpeedChange(key as keyof typeof SPEED_PRESETS)}>
                      {label}
                    </OptionButton>
                  ))}
                </div>
                {/* Custom speed slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-black/30 dark:text-white/30">Custom</span>
                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40">{(props.customSpeedMs / 1000).toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={30000}
                    step={500}
                    value={props.customSpeedMs}
                    onChange={e => props.onCustomSpeedMsChange(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-black/10 dark:bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white"
                  />
                  <div className="flex justify-between text-[9px] text-black/20 dark:text-white/20">
                    <span>1s</span>
                    <span>30s</span>
                  </div>
                </div>

                {/* Transition */}
                <SubLabel>Transition</SubLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['fade', 'slide', 'zoom', 'crossfade'] as TransitionType[]).map(t => (
                    <OptionButton key={t} active={props.transition === t} onClick={() => props.onTransitionChange(t)} className="capitalize">
                      {t}
                    </OptionButton>
                  ))}
                </div>

                {/* Background */}
                <SubLabel>Background</SubLabel>
                <div className="space-y-1">
                  {(Object.entries(BG_PRESETS) as [BackgroundMode, { label: string; desc: string }][]).map(([key, { label }]) => (
                    <OptionButton key={key} active={props.bgMode === key} onClick={() => props.onBgModeChange(key)} className="w-full text-left">
                      {label}
                    </OptionButton>
                  ))}
                  {props.bgMode === 'custom' && (
                    <div className="flex items-center gap-2 px-2 pt-1">
                      <input type="color" value={props.customBgColor} onChange={e => props.onCustomBgColorChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                      <span className="text-xs text-black/40 dark:text-white/40 font-mono">{props.customBgColor}</span>
                    </div>
                  )}
                </div>

                {/* Frame */}
                <SubLabel>Frame</SubLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(FRAME_STYLES) as [FrameStyle, { label: string }][]).map(([key, { label }]) => (
                    <OptionButton key={key} active={props.frameStyle === key} onClick={() => props.onFrameStyleChange(key)}>
                      {label}
                    </OptionButton>
                  ))}
                </div>

                {/* Dark mode */}
                <div className="pt-2">
                  <ToggleRow icon={<Moon className="h-3.5 w-3.5" />} label="Dark mode" shortcut="D" active={props.isDarkMode} onClick={props.onDarkModeToggle} />
                </div>
              </SectionContent>
            )}
          </AnimatePresence>

          {/* ── CURATION SECTION ────────────────────────── */}
          <SectionButton
            icon={<Filter className="h-4 w-4" />}
            label="Curation"
            desc="Filters, playlists, shuffle, gallery wall"
            isOpen={expandedSection === 'curation'}
            onClick={() => toggleSection('curation')}
          />
          <AnimatePresence>
            {expandedSection === 'curation' && (
              <SectionContent>
                {/* Shuffle */}
                <ToggleRow icon={<Shuffle className="h-3.5 w-3.5" />} label="Shuffle" shortcut="S" active={props.isShuffle} onClick={props.onShuffleToggle} />

                {/* Show info */}
                <ToggleRow icon={<Volume2 className="h-3.5 w-3.5" />} label="Show artwork info" shortcut="I" active={props.showMetadata} onClick={props.onMetadataToggle} />

                {/* Price overlay */}
                <ToggleRow icon={<BarChart3 className="h-3.5 w-3.5" />} label="Show floor price" active={props.showPriceOverlay} onClick={props.onPriceOverlayToggle} />

                {/* Gallery Wall */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
                  <ToggleRow icon={<LayoutGrid className="h-3.5 w-3.5" />} label="Gallery Wall" active={props.isGalleryWallMode} onClick={props.onGalleryWallToggle} />
                  {props.isGalleryWallMode && (
                    <div className="grid grid-cols-3 gap-1.5 mt-2 ml-6">
                      {([2, 3, 4] as GridSize[]).map(s => (
                        <OptionButton key={s} active={props.galleryWallSize === s} onClick={() => props.onGalleryWallSizeChange(s)}>
                          {s}×{s}
                        </OptionButton>
                      ))}
                    </div>
                  )}
                </div>

                {/* Collection filter */}
                {props.collections.length > 1 && (
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
                    <SubLabel>Collection</SubLabel>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      <OptionButton active={!props.selectedCollection} onClick={() => props.onCollectionChange(null)} className="w-full text-left">
                        All ({props.totalNfts})
                      </OptionButton>
                      {props.collections.map(name => (
                        <OptionButton key={name} active={props.selectedCollection === name} onClick={() => props.onCollectionChange(name)} className="w-full text-left truncate">
                          {name}
                        </OptionButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto groups */}
                {props.autoGroups.length > 0 && (
                  <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
                    <SubLabel>Smart Groups</SubLabel>
                    <div className="space-y-1">
                      <OptionButton active={!props.activeAutoGroup} onClick={() => props.onAutoGroupChange(null)} className="w-full text-left">
                        All
                      </OptionButton>
                      {props.autoGroups.map(g => (
                        <OptionButton key={g.key} active={props.activeAutoGroup === g.key} onClick={() => props.onAutoGroupChange(g.key)} className="w-full text-left">
                          {g.label} ({g.count})
                        </OptionButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Playlists */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
                  <ActionRow icon={<List className="h-3.5 w-3.5" />} label={props.activePlaylist ? `Playlist: ${props.activePlaylist.name}` : 'Playlists'} onClick={props.onPlaylistOpen} />
                </div>

                {/* Restore hidden */}
                {props.hiddenCount > 0 && (
                  <ActionRow icon={<Undo2 className="h-3.5 w-3.5" />} label={`Restore ${props.hiddenCount} hidden`} onClick={props.onRestoreHidden} className="text-red-500" />
                )}
              </SectionContent>
            )}
          </AnimatePresence>

          {/* ── TOOLS SECTION ───────────────────────────── */}
          <SectionButton
            icon={<Frame className="h-4 w-4" />}
            label="Tools"
            desc="Remote, embed, ambience, analytics"
            isOpen={expandedSection === 'tools'}
            onClick={() => toggleSection('tools')}
          />
          <AnimatePresence>
            {expandedSection === 'tools' && (
              <SectionContent>
                {/* Remote */}
                <ActionRow icon={<Smartphone className="h-3.5 w-3.5" />} label="Phone Remote" onClick={props.onRemoteOpen} />

                {/* Embed */}
                <ActionRow icon={<Code2 className="h-3.5 w-3.5" />} label="Embed Widget" onClick={props.onEmbedOpen} />

                {/* Download */}
                <ActionRow icon={<Download className="h-3.5 w-3.5" />} label="Download Current NFT" onClick={props.onDownload} />

                {/* Share link */}
                <ActionRow icon={<Copy className="h-3.5 w-3.5" />} label={props.copied ? '✓ Copied!' : 'Copy Share Link'} onClick={props.onCopyLink} />

                {/* Ambience */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
                  <SubLabel>Ambience</SubLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AMBIENCE_OPTIONS.map(opt => (
                      <OptionButton key={opt.key} active={props.ambienceMode === opt.key} onClick={() => props.onAmbienceModeChange(opt.key)}>
                        {opt.icon} {opt.label}
                      </OptionButton>
                    ))}
                  </div>
                </div>

                {/* Analytics */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
                  <ActionRow icon={<BarChart3 className="h-3.5 w-3.5" />} label="View Analytics" onClick={props.onAnalyticsOpen} />
                </div>

                {/* Walkthrough */}

              </SectionContent>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard shortcuts */}
        <div className="border-t border-black/10 dark:border-white/10 px-5 py-4 mt-4">
          <p className="text-xs text-black/30 dark:text-white/30 font-light mb-2">Keyboard Shortcuts</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-black/40 dark:text-white/40">
            <span>← → Navigate</span>
            <span>Space Play/Pause</span>
            <span>F Fullscreen</span>
            <span>I Info toggle</span>
            <span>S Shuffle</span>
            <span>D Dark mode</span>
            <span>M Mute</span>
            <span>Esc Exit</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ── Reusable sub-components ────────────────────────────────

function SectionButton({ icon, label, desc, isOpen, onClick }: {
  icon: React.ReactNode; label: string; desc: string; isOpen: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
        isOpen ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-black/60 dark:text-white/60 shrink-0">
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-black dark:text-white">{label}</p>
        <p className="text-xs text-black/40 dark:text-white/40 font-light truncate">{desc}</p>
      </div>
      <ChevronRight className={`h-4 w-4 text-black/20 dark:text-white/20 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
    </button>
  );
}

function SectionContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="px-3 py-3 space-y-3">
        {children}
      </div>
    </motion.div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-wider">{children}</p>;
}

function OptionButton({ children, active, onClick, className = '' }: {
  children: React.ReactNode; active: boolean; onClick: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
        active
          ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
          : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ToggleRow({ icon, label, shortcut, active, onClick }: {
  icon: React.ReactNode; label: string; shortcut?: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
      <span className="text-black/50 dark:text-white/50">{icon}</span>
      <span className="flex-1 text-left text-xs text-black/70 dark:text-white/70">{label}</span>
      {shortcut && <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-black/30 dark:text-white/30 font-mono">{shortcut}</kbd>}
      <div className={`w-8 h-5 rounded-full transition-colors flex items-center ${active ? 'bg-black dark:bg-white justify-end' : 'bg-black/10 dark:bg-white/10 justify-start'}`}>
        <div className={`w-3.5 h-3.5 rounded-full mx-0.5 transition-colors ${active ? 'bg-white dark:bg-black' : 'bg-black/20 dark:bg-white/20'}`} />
      </div>
    </button>
  );
}

function ActionRow({ icon, label, onClick, className = '' }: {
  icon: React.ReactNode; label: string; onClick: () => void; className?: string;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${className}`}>
      <span className="text-black/50 dark:text-white/50">{icon}</span>
      <span className="flex-1 text-left text-xs text-black/70 dark:text-white/70">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-black/15 dark:text-white/15" />
    </button>
  );
}
