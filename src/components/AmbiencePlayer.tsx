import { useEffect, useRef } from 'react';

export type AmbienceMode = 'silence' | 'brown-noise' | 'rain' | 'gallery';

interface AmbiencePlayerProps {
  mode: AmbienceMode;
  isMuted: boolean;
  volume?: number; // 0-1
}

// ── Brown noise generator ──────────────────────────────────
function createBrownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 4; // 4 seconds looping
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // Amplify
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

// ── Rain simulation ──────────────────────────────────────
function createRain(ctx: AudioContext, gainNode: GainNode): (() => void) {
  const nodes: AudioNode[] = [];

  // Base white noise filtered for rain
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // High-pass filter to get "hiss" of rain
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 400;

  // Low-pass to soften
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 8000;

  source.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(gainNode);
  source.start();
  nodes.push(source, hpf, lpf);

  // Add random drip impacts via LFO amplitude modulation
  const modOsc = ctx.createOscillator();
  modOsc.type = 'sine';
  modOsc.frequency.value = 0.3;
  const modGain = ctx.createGain();
  modGain.gain.value = 0.15;
  modOsc.connect(modGain);
  modGain.connect(gainNode.gain as unknown as AudioNode);
  modOsc.start();
  nodes.push(modOsc, modGain);

  return () => {
    nodes.forEach(n => {
      try { (n as AudioBufferSourceNode).stop?.(); } catch {}
    });
  };
}

// ── Gallery ambience (very subtle sine + minor reverb) ────
function createGallery(ctx: AudioContext, gainNode: GainNode): (() => void) {
  // Extremely low sine wave trio for "room tone" feeling
  const freqs = [60, 90, 120];
  const oscs: OscillatorNode[] = [];

  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0.015;
    osc.connect(g);
    g.connect(gainNode);
    osc.start();
    oscs.push(osc);
  }

  // Very slow LFO for gentle "breathing"
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.008;
  lfo.connect(lfoGain);
  lfoGain.connect(gainNode.gain as unknown as AudioNode);
  lfo.start();
  oscs.push(lfo);

  return () => {
    oscs.forEach(o => { try { o.stop(); } catch {} });
  };
}

export function AmbiencePlayer({ mode, isMuted, volume = 0.08 }: AmbiencePlayerProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (mode === 'silence') {
      // Tear down everything
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
      }
      return;
    }

    // Lazy-init AudioContext
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = ctxRef.current;

    // Master gain
    if (!gainRef.current) {
      gainRef.current = ctx.createGain();
      gainRef.current.connect(ctx.destination);
    }

    const gain = gainRef.current;
    gain.gain.setTargetAtTime(isMuted ? 0 : volume, ctx.currentTime, 0.1);

    // Tear down previous
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }

    // Resume context (needed after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (mode === 'brown-noise') {
      const src = createBrownNoise(ctx);
      src.connect(gain);
      src.start();
      sourceRef.current = src;
    } else if (mode === 'rain') {
      cleanupRef.current = createRain(ctx, gain);
    } else if (mode === 'gallery') {
      cleanupRef.current = createGallery(ctx, gain);
    }

    return () => {
      // Don't destroy ctx on mode change — just swap sources
    };
  }, [mode]);

  // Mute/unmute
  useEffect(() => {
    if (!ctxRef.current || !gainRef.current) return;
    const ctx = ctxRef.current;
    gainRef.current.gain.setTargetAtTime(isMuted ? 0 : volume, ctx.currentTime, 0.1);
  }, [isMuted, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (sourceRef.current) { try { sourceRef.current.stop(); } catch {} }
      if (ctxRef.current) { ctxRef.current.close(); }
    };
  }, []);

  return null; // Headless audio component
}

export const AMBIENCE_OPTIONS: { key: AmbienceMode; label: string; icon: string }[] = [
  { key: 'silence',     label: 'Silence',      icon: '🔇' },
  { key: 'brown-noise', label: 'Brown Noise',   icon: '🌊' },
  { key: 'rain',        label: 'Rain',          icon: '🌧' },
  { key: 'gallery',     label: 'Gallery Hum',   icon: '🏛' },
];
