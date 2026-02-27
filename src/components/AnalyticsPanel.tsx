import { AnimatePresence, motion } from 'framer-motion';
import { BarChart2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { clearAnalytics, getAnalytics, type AnalyticsData } from '@/lib/analytics';

interface AnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export function AnalyticsPanel({ isOpen, onClose }: AnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load fresh data when opened
  const loadData = () => {
    setData(getAnalytics());
  };

  const handleClear = () => {
    clearAnalytics();
    setData(getAnalytics());
    setShowClearConfirm(false);
  };

  return (
    <AnimatePresence onExitComplete={() => setData(null)}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          onAnimationStart={loadData}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-black/60" />
                <h2 className="text-base font-semibold text-black">Visitor Analytics</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-black/60" />
              </button>
            </div>

            {data ? (
              <div className="px-6 py-4 space-y-5">
                {/* Top stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-black">{data.totalViews}</p>
                    <p className="text-xs text-black/50 mt-0.5">Total Views</p>
                  </div>
                  <div className="bg-black/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-black">{data.sessionCount}</p>
                    <p className="text-xs text-black/50 mt-0.5">Sessions</p>
                  </div>
                  <div className="bg-black/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-black">{data.topNFTs.length}</p>
                    <p className="text-xs text-black/50 mt-0.5">NFTs Viewed</p>
                  </div>
                </div>

                {/* Visitor info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-black/50">Visitor ID</span>
                    <span className="font-mono text-xs bg-black/5 px-2 py-0.5 rounded text-black/70">{data.visitorId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/50">First Seen</span>
                    <span className="text-black/80">{formatDate(data.firstSeen)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/50">Last Seen</span>
                    <span className="text-black/80">{formatDate(data.lastSeen)}</span>
                  </div>
                </div>

                {/* Top NFTs */}
                {data.topNFTs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-2">Most Viewed NFTs</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {data.topNFTs.map((nft, i) => (
                        <div key={nft.tokenId} className="flex items-center gap-3">
                          <span className="text-xs text-black/30 w-4 shrink-0">#{i + 1}</span>
                          {nft.imageUrl && (
                            <img
                              src={nft.imageUrl}
                              alt=""
                              className="w-8 h-8 rounded object-cover shrink-0 bg-black/5"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-black truncate">{nft.name || nft.tokenId}</p>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-1.5 rounded-full bg-black/20"
                                style={{
                                  width: `${Math.min(100, (nft.totalMs / (data.topNFTs[0]?.totalMs || 1)) * 100)}%`,
                                  background: `hsl(${220 + i * 15}, 70%, 50%)`,
                                }}
                              />
                              <span className="text-xs text-black/40 shrink-0">
                                {formatDuration(nft.totalMs)} · {nft.views}x
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.topNFTs.length === 0 && (
                  <p className="text-sm text-black/40 text-center py-4">
                    No NFT view data yet.<br />
                    <span className="text-xs">Dwell time is tracked as you browse.</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="px-6 py-8 text-center text-black/40 text-sm">Loading analytics…</div>
            )}

            {/* Footer */}
            <div className="px-6 py-3 border-t border-black/10 flex items-center justify-between">
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Clear all data?</span>
                  <button onClick={handleClear} className="text-xs text-red-600 font-medium hover:underline">Yes, clear</button>
                  <button onClick={() => setShowClearConfirm(false)} className="text-xs text-black/40 hover:underline">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-black/30 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear data
                </button>
              )}
              <Button variant="outline" size="sm" onClick={onClose} className="border-black/20 text-black/70">
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
