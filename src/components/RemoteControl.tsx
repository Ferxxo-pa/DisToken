import { Button } from "@/components/ui/button";
import { type RemoteState, RemoteClient } from "@/lib/remote";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Info, Maximize, Pause, Play,
  Shuffle, Smartphone, Wifi, WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Remote control UI for the phone browser */
interface RemoteControlPageProps {
  roomCode: string;
}

export function RemoteControlPage({ roomCode }: RemoteControlPageProps) {
  const [state, setState] = useState<RemoteState | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<RemoteClient | null>(null);
  const pingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const client = new RemoteClient(roomCode, (newState) => {
      setState(newState);
      setConnected(true);
    });
    clientRef.current = client;

    // Ping every 2s to check connection
    pingInterval.current = setInterval(() => {
      client.send({ type: 'ping' });
    }, 2000);

    // Timeout: if no pong in 5s, mark disconnected
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
      if (pingInterval.current) clearInterval(pingInterval.current);
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
            <Smartphone className="h-5 w-5 text-white/60" />
            <h1 className="text-sm font-medium tracking-tight">DisToken Remote</h1>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <Wifi className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <WifiOff className="h-3.5 w-3.5" /> Disconnected
              </span>
            )}
            <span className="text-xs text-white/30 font-mono">#{roomCode}</span>
          </div>
        </div>
      </header>

      {!connected && !state ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
              <Wifi className="h-8 w-8 text-white/20 animate-pulse" />
            </div>
            <p className="text-sm text-white/40 font-light">Connecting to display...</p>
            <p className="text-xs text-white/20 font-light">Make sure both devices are on the same page</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-4 gap-4">
          {/* Current NFT preview */}
          {state && (
            <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
              {state.currentImage && (
                <div className="aspect-square max-h-48 mx-auto overflow-hidden">
                  <img
                    src={state.currentImage}
                    alt={state.currentName}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div className="p-4 space-y-1">
                <p className="text-sm font-medium truncate">{state.currentName || 'Unknown'}</p>
                <p className="text-xs text-white/40 truncate">{state.currentCollection || ''}</p>
                <p className="text-xs text-white/20">
                  {state.currentIndex + 1} / {state.total}
                </p>
              </div>
            </div>
          )}

          {/* Main controls */}
          <div className="flex items-center justify-center gap-4 py-4">
            <button
              onClick={() => send('prev')}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={() => send('toggle-play')}
              className="w-20 h-20 rounded-full bg-white text-black hover:bg-white/90 active:bg-white/80 flex items-center justify-center transition-colors shadow-lg"
            >
              {state?.isPlaying ? (
                <Pause className="h-10 w-10" />
              ) : (
                <Play className="h-10 w-10 ml-1" />
              )}
            </button>
            <button
              onClick={() => send('next')}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </div>

          {/* Secondary controls */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => send('toggle-shuffle')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <Shuffle className="h-5 w-5 text-white/70" />
              <span className="text-xs text-white/40">Shuffle</span>
            </button>
            <button
              onClick={() => send('toggle-info')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <Info className="h-5 w-5 text-white/70" />
              <span className="text-xs text-white/40">Info</span>
            </button>
            <button
              onClick={() => send('toggle-fullscreen')}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors"
            >
              <Maximize className="h-5 w-5 text-white/70" />
              <span className="text-xs text-white/40">Fullscreen</span>
            </button>
          </div>

          {/* Speed presets */}
          <div className="space-y-2">
            <p className="text-xs text-white/30 font-light">Speed</p>
            <div className="flex gap-2">
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
                  {s === 'veryFast' ? 'Fast+' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
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

  // Simple text-based QR alternative (actual QR would need a library)
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
              Open this URL on your phone to control the display
            </p>
          </div>

          {/* Room code display */}
          <div className="bg-black/5 rounded-xl p-4 space-y-3">
            <p className="text-xs text-black/40 uppercase tracking-wider">Room Code</p>
            <p className="text-4xl font-mono font-bold tracking-[0.3em] text-black">
              {roomCode}
            </p>
          </div>

          {/* URL */}
          <div className="bg-black/5 rounded-xl p-3">
            <p className="text-xs text-black/40 mb-1">Or visit directly:</p>
            <p className="text-sm font-mono text-black/70 break-all">{remoteUrl}</p>
          </div>

          <p className="text-xs text-black/30 font-light">
            Both devices must be on the same page origin for the connection to work.
          </p>

          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
