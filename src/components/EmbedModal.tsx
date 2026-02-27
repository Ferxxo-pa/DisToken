import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface EmbedModalProps {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

type EmbedSize = 'small' | 'medium' | 'large' | 'fullscreen';

const SIZES: Record<EmbedSize, { label: string; width: number; height: number }> = {
  small:      { label: 'Small',      width: 400,  height: 300 },
  medium:     { label: 'Medium',     width: 640,  height: 480 },
  large:      { label: 'Large',      width: 960,  height: 640 },
  fullscreen: { label: 'Fullscreen', width: 1280, height: 720 },
};

export function EmbedModal({ walletAddress, isOpen, onClose }: EmbedModalProps) {
  const [selectedSize, setSelectedSize] = useState<EmbedSize>('medium');
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/${encodeURIComponent(walletAddress)}?embed=true`;
  const { width, height } = SIZES[selectedSize];

  const embedCode = selectedSize === 'fullscreen'
    ? `<iframe\n  src="${embedUrl}"\n  style="width:100%;height:100vh;border:none;"\n  allow="autoplay"\n  loading="lazy"\n></iframe>`
    : `<iframe\n  src="${embedUrl}"\n  width="${width}"\n  height="${height}"\n  style="border:none;border-radius:12px;"\n  allow="autoplay"\n  loading="lazy"\n></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
              <div>
                <h2 className="text-base font-semibold text-black">Embed Gallery</h2>
                <p className="text-xs text-black/50 mt-0.5">Add this gallery to any website</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-black/60" />
              </button>
            </div>

            {/* Size picker */}
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-black/60 mb-2 uppercase tracking-wider">Size</p>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(SIZES) as [EmbedSize, typeof SIZES[EmbedSize]][]).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedSize(key)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSize === key
                        ? 'bg-black text-white'
                        : 'bg-black/5 hover:bg-black/10 text-black/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedSize !== 'fullscreen' && (
                <p className="text-xs text-black/40 mt-2">{width} × {height} px</p>
              )}
            </div>

            {/* Preview (small iframe preview box) */}
            <div className="px-6 pb-4">
              <p className="text-xs font-semibold text-black/60 mb-2 uppercase tracking-wider">Preview</p>
              <div className="relative bg-black/5 rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full rounded-lg border-0"
                  allow="autoplay"
                  title="Embed preview"
                />
              </div>
              <p className="text-xs text-black/40 mt-2">
                Embed URL: <span className="font-mono text-black/60 break-all">{embedUrl}</span>
              </p>
            </div>

            {/* Code block */}
            <div className="px-6 pb-4">
              <p className="text-xs font-semibold text-black/60 mb-2 uppercase tracking-wider">HTML Code</p>
              <div className="relative bg-black/5 rounded-lg p-4 font-mono text-xs text-black/80 whitespace-pre overflow-x-auto">
                {embedCode}
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white shadow-sm border border-black/10 text-xs font-medium hover:bg-black/5 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-black/10 bg-black/2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-black/20 text-black/80 hover:bg-black/5"
              >
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
