import { type RemoteState, RemoteClient } from "@/lib/remote";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown, ChevronLeft, ChevronRight, Info,
  Maximize, Moon, Pause, Play, Shuffle, Smartphone, Wifi, WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Collapsible section for remote settings */
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <span className="text-xs font-medium text-white/60">{title}</span>
        <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

interface RemoteControlPageProps {
  roomCode: string;
}

export function RemoteControlPage({ roomCode }: RemoteControlPageProps) {
  const [state, setState] = useState<RemoteState | null>(null);
  const [connected, setConnected] = useState(false);
  const [customSpeedMs, setCustomSpeedMs] = useState(5000);
  const clientRef = useRef<RemoteClient | null>(null);

  useEffect(() => {
    const client = new RemoteClient(roomCode, (newState) => {
      setState(newState);
      setConnected(true);
    });
    clientRef.current = client;

    const pingInterval = setInterval(() => {
      client.send({ type: 'ping' });
    }, 2000);

    let timeout: ReturnType<typeof setTimeout>;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setConnected(false), 5000);
    };
    resetTimeout();
    const origOnState = client['onState'];
    client['onState'] = (s) => { origOnState(s); resetTimeout(); };

    return () => {
      client.destroy();
      clearInterval(pingInterval);
      clearTimeout(timeout);
    };
  }, [roomCode]);

  const send = (type: string, extra?: any) => {
    clientRef.current?.send({ type, ...extra } as any);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-white/50" />
            <span className="text-sm font-medium">DisToken Remote</span>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <Wifi className="h-3 w-3" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
            <span className="text-[10px] text-white/20 font-mono">#{roomCode}</span>
          </div>
        </div>
      </header>

      {!connected && !state ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Wifi className="h-10 w-10 text-white/20 animate-pulse mx-auto" />
            <p className="text-sm text-white/40">Connecting to display...</p>
            <p className="text-xs text-white/20">Both devices must have the same DisToken page open</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto pb-8">
          {/* Now playing */}
          {state && (
            <div className="text-center py-1">
              <p className="text-sm font-medium truncate">{state.currentName || 'Unknown'}</p>
              <p className="text-[11px] text-white/30">{state.currentIndex + 1} / {state.total}</p>
            </div>
          )}

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => send('prev')}
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              onClick={() => send('toggle-play')}
              className="w-18 h-18 rounded-full bg-white text-black hover:bg-white/90 active:bg-white/80 flex items-center justify-center transition-colors shadow-lg"
              style={{ width: 72, height: 72 }}
            >
              {state?.isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9 ml-1" />}
            </button>
            <button
              onClick={() => send('next')}
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>

          {/* Quick toggles row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Shuffle className="h-4 w-4" />, label: 'Shuffle', action: () => send('toggle-shuffle') },
              { icon: <Info className="h-4 w-4" />, label: 'Info', action: () => send('toggle-info') },
              { icon: <Maximize className="h-4 w-4" />, label: 'Full', action: () => send('toggle-fullscreen') },
              { icon: <Moon className="h-4 w-4" />, label: 'Theme', action: () => send('toggle-dark') },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
              >
                <span className="text-white/60">{btn.icon}</span>
                <span className="text-[10px] text-white/35">{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Speed section */}
          <Section title="Speed" defaultOpen>
            <div className="flex gap-1.5">
              {['ambient', 'slow', 'normal', 'fast', 'veryFast'].map(s => (
                <button
                  key={s}
                  onClick={() => send('set-speed', { speed: s })}
                  className={`flex-1 py-2 rounded-lg text-xs transition-colors ${
                    state?.speed === s
                      ? 'bg-white text-black font-medium'
                      : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {s === 'veryFast' ? 'Fast+' : s === 'ambient' ? 'Amb' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/20">Custom</span>
                <span className="text-[10px] font-mono text-white/30">{(customSpeedMs / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={1000}
                max={30000}
                step={500}
                value={customSpeedMs}
                onChange={e => {
                  const ms = Number(e.target.value);
                  setCustomSpeedMs(ms);
                  send('set-custom-speed', { ms });
                }}
                className="w-full h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
            </div>
          </Section>

          {/* Display section */}
          <Section title="Display">
            <div className="space-y-2">
              <p className="text-[10px] text-white/25">Transition</p>
              <div className="grid grid-cols-4 gap-1.5">
                {['fade', 'slide', 'zoom', 'crossfade'].map(t => (
                  <button
                    key={t}
                    onClick={() => send('set-transition', { transition: t })}
                    className="py-2 rounded-lg text-xs bg-white/5 text-white/40 hover:bg-white/10 active:bg-white/15 transition-colors capitalize"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/25">Background</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'blur', label: '🌫 Blur' },
                  { key: 'dark', label: '⬛ Dark' },
                  { key: 'light', label: '⬜ Light' },
                  { key: 'match', label: '🎨 Match' },
                  { key: 'custom', label: '🖌 Custom' },
                ].map(bg => (
                  <button
                    key={bg.key}
                    onClick={() => send('set-bg', { mode: bg.key })}
                    className="py-2 rounded-lg text-xs bg-white/5 text-white/40 hover:bg-white/10 active:bg-white/15 transition-colors"
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-white/25">Frame</p>
              <div className="grid grid-cols-3 gap-1.5">
                {['none', 'minimal', 'gallery', 'modern', 'ornate'].map(f => (
                  <button
                    key={f}
                    onClick={() => send('set-frame', { frame: f })}
                    className="py-2 rounded-lg text-xs bg-white/5 text-white/40 hover:bg-white/10 active:bg-white/15 transition-colors capitalize"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

/** QR code overlay shown on the TV/kiosk display */
export function RemoteQROverlay({
  roomCode,
  baseUrl,
  isOpen,
  onClose,
}: {
  roomCode: string;
  baseUrl: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const remoteUrl = `${baseUrl}/remote/${roomCode}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="space-y-2">
            <Smartphone className="h-10 w-10 mx-auto text-black/60" />
            <h2 className="text-xl font-semibold text-black">Phone Remote</h2>
            <p className="text-sm text-black/50 font-light">
              Open this URL on another tab to control the display
            </p>
          </div>

          <div className="bg-black/5 rounded-xl p-4 space-y-3">
            <p className="text-xs text-black/40 uppercase tracking-wider">Room Code</p>
            <p className="text-4xl font-mono font-bold tracking-[0.3em] text-black">
              {roomCode}
            </p>
          </div>

          <div className="bg-black/5 rounded-xl p-3">
            <p className="text-xs text-black/40 mb-1">Open in another tab:</p>
            <p className="text-sm font-mono text-black/70 break-all">{remoteUrl}</p>
          </div>

          <p className="text-xs text-black/30 font-light">
            Remote works between tabs in the same browser. For cross-device control, open the URL on both devices.
          </p>

          <button onClick={onClose} className="w-full py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/80 transition-colors">
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
