import { AnimatePresence, motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NFT } from '@/lib/nft';

interface ZoomLightboxProps {
  nft: NFT;
  isOpen: boolean;
  onClose: () => void;
}

export function ZoomLightbox({ nft, isOpen, onClose }: ZoomLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const lastPinchDist = useRef(0);
  const lastPinchScale = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(s => Math.max(0.5, Math.min(5, s + delta)));
  }, []);

  // Mouse drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Touch pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastPinchScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      dragStart.current = {
        x: e.touches[0].clientX, y: e.touches[0].clientY,
        posX: position.x, posY: position.y,
      };
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / lastPinchDist.current;
      setScale(Math.max(0.5, Math.min(5, lastPinchScale.current * ratio)));
    } else if (e.touches.length === 1 && scale > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
    }
  }, [scale]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = 0;
  }, []);

  const zoomIn = () => setScale(s => Math.min(5, s + 0.5));
  const zoomOut = () => setScale(s => { const next = Math.max(0.5, s - 0.5); if (next <= 1) setPosition({ x: 0, y: 0 }); return next; });
  const resetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={handleBackdropClick}
          ref={containerRef}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
            <button onClick={zoomOut} className="text-white/70 hover:text-white p-1 transition-colors">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button onClick={resetZoom} className="text-white/70 hover:text-white text-sm px-2 transition-colors min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </button>
            <button onClick={zoomIn} className="text-white/70 hover:text-white p-1 transition-colors">
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Image container */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div
              style={{
                scale,
                x: position.x,
                y: position.y,
                transformOrigin: 'center center',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
              className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            >
              <img
                src={nft.imageUrl}
                alt={nft.name || 'NFT'}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
                style={{ imageRendering: 'auto' }}
              />
            </motion.div>
          </div>

          {/* Title */}
          {nft.name && (
            <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
              <p className="text-white text-sm font-medium">{nft.name}</p>
              {nft.collectionName && (
                <p className="text-white/60 text-xs">{nft.collectionName}</p>
              )}
            </div>
          )}

          {/* Hint */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 text-white/40 text-xs pointer-events-none">
            Scroll or pinch to zoom · Drag to pan · Click outside to close
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
