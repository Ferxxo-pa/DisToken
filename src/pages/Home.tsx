import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NFTSlideshow } from "@/components/NFTSlideshow";
import { fetchNFTsForWallet, fetchMultiWallet, detectChain, type NFTCollection } from "@/lib/nft";
import { Sparkles } from "lucide-react";
import { Waitlist } from "@/components/Waitlist";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

// Words ordered by length (shortest to longest)
const CYCLING_WORDS = [
  "NFTs",
  "jpegs",
  "assets",
  "tokens",
  "digital art",
  "collectibles",
  "on-chain art",
];

function CyclingHeroText() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      
      // After animation completes, update to next word
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % CYCLING_WORDS.length);
        setIsAnimating(false);
      }, 600);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get next word for incoming animation
  const nextIndex = (currentWordIndex + 1) % CYCLING_WORDS.length;

  return (
    <h2 className="text-5xl md:text-7xl font-light tracking-tight text-center">
      Showcase your{" "}
      <span className="inline-block font-bold relative align-bottom w-[280px] md:w-[420px]" style={{ height: '1.2em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {/* Current word - exits downward */}
        <span
          key={`current-${currentWordIndex}`}
          className="absolute transition-all duration-600 ease-in-out"
          style={{
            transform: isAnimating ? 'translateY(120%)' : 'translateY(0)',
            opacity: isAnimating ? 0 : 1,
          }}
        >
          {CYCLING_WORDS[currentWordIndex]}
        </span>
        {/* Next word - enters from top only during animation */}
        {isAnimating && (
          <span
            key={`next-${nextIndex}`}
            className="absolute transition-all duration-600 ease-in-out"
            style={{
              transform: 'translateY(-120%)',
              opacity: 0,
              animation: 'slideInFromTop 600ms ease-in-out forwards',
            }}
          >
            {CYCLING_WORDS[nextIndex]}
          </span>
        )}
      </span>
    </h2>
  );
}

interface HomeProps {
  initialWallet?: string;
  kioskMode?: boolean;
  embedMode?: boolean;
}

export default function Home({ initialWallet, kioskMode = false, embedMode = false }: HomeProps = {}) {
  const [walletAddress, setWalletAddress] = useState(initialWallet ?? "");
  const [activeWallet, setActiveWallet] = useState<string | null>(initialWallet ?? null);
  const [validationError, setValidationError] = useState("");
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [nftData, setNftData] = useState<NFTCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [, navigate] = useLocation();
  const [showProWaitlist, setShowProWaitlist] = useState(false);
  const [proEmail, setProEmail] = useState('');
  const [proSubmitted, setProSubmitted] = useState(false);

  useEffect(() => {
    setIsPageLoaded(true);
  }, []);

  useEffect(() => {
    if (activeWallet) {
      setIsLoading(true);
      setError(null);

      // Support comma-separated multi-wallet
      const wallets = activeWallet.split(',').map(w => w.trim()).filter(Boolean);
      const fetcher = wallets.length > 1
        ? fetchMultiWallet(wallets)
        : fetchNFTsForWallet(wallets[0]);
      
      fetcher
        .then((data) => {
          setNftData(data);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message || "Failed to fetch NFTs");
          setIsLoading(false);
        });
    }
  }, [activeWallet]);

  const validateAddress = (address: string): boolean => {
    const trimmed = address.trim();
    if (!trimmed) {
      setValidationError("Please enter a wallet address");
      return false;
    }
    // Support comma-separated multi-wallet
    const wallets = trimmed.split(',').map(w => w.trim()).filter(Boolean);
    for (const w of wallets) {
      const chain = detectChain(w);
      if (chain === 'unknown') {
        setValidationError(`Invalid address: "${w.slice(0, 20)}…" — enter Ethereum (0x… / .eth) or Solana address / .sol`);
        return false;
      }
    }
    setValidationError("");
    return true;
  };

  const setWallet = (address: string) => {
    const chain = detectChain(address.trim());
    const normalized = chain === 'ethereum'
      ? address.trim().toLowerCase()
      : address.trim();
    setActiveWallet(normalized);
    navigate(`/${encodeURIComponent(normalized)}`);
  };

  const handleProWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proEmail.trim()) return;
    const formId = import.meta.env.VITE_FORMSPREE_ID;
    if (formId) {
      fetch(`https://formspree.io/f/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: proEmail, type: 'pro-waitlist' }),
      }).catch(() => {});
    }
    // Also store locally
    try {
      const existing = JSON.parse(localStorage.getItem('distoken:pro-waitlist') ?? '[]');
      existing.push({ email: proEmail, at: Date.now() });
      localStorage.setItem('distoken:pro-waitlist', JSON.stringify(existing));
    } catch {}
    setProSubmitted(true);
    setTimeout(() => {
      setShowProWaitlist(false);
      setProSubmitted(false);
      setProEmail('');
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAddress(walletAddress)) setWallet(walletAddress);
  };

  const handleExampleWallet = () => {
    const examples = ["ezven.eth", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"];
    const current = walletAddress;
    const next = examples.find(e => e !== current) ?? examples[0];
    setWalletAddress(next);
    setWallet(next);
  };

  const handleChangeWallet = () => {
    setActiveWallet(null);
    setWalletAddress("");
    setNftData(null);
    setError(null);
    navigate('/');
  };

  if (activeWallet) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <p className="text-muted-foreground font-light text-lg">
              Loading collection
              <span className="inline-flex ml-1">
                <span className="animate-[fadeIn_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}>.</span>
                <span className="animate-[fadeIn_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-[fadeIn_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}>.</span>
              </span>
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-medium">Unable to Load NFTs</h2>
              <p className="text-sm text-muted-foreground font-light">
                {error}
              </p>
            </div>
            <Button
              onClick={handleChangeWallet}
              variant="outline"
              className="border-border hover:bg-accent transition-colors"
            >
              Try Another Wallet
            </Button>
          </div>
        </div>
      );
    }

    if (nftData && nftData.nfts.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
              <span className="text-2xl">🖼️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-medium">No NFTs Found</h2>
              <p className="text-sm text-muted-foreground font-light">
                This wallet doesn't contain any NFTs yet.
              </p>
            </div>
            <Button
              onClick={handleChangeWallet}
              variant="outline"
              className="border-border hover:bg-accent transition-colors"
            >
              Try Another Wallet
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <NFTSlideshow
          nfts={nftData?.nfts || []}
          walletAddress={activeWallet}
          chain={nftData?.chain}
          onChangeWallet={embedMode ? undefined : handleChangeWallet}
          kioskMode={kioskMode}
          embedMode={embedMode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-light tracking-wider uppercase">
              Display
            </p>
            <h1 className="text-lg font-medium tracking-tight">
              DisToken
            </h1>
            <p className="text-sm font-light tracking-wider uppercase">
              Tokens
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl space-y-8">
          {/* Hero Text */}
          <div 
            className="text-center space-y-4 transition-all duration-700 ease-out"
            style={{
              opacity: isPageLoaded ? 1 : 0,
              transform: isPageLoaded ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <CyclingHeroText />
            <p className="text-muted-foreground font-light max-w-md mx-auto">
              Enter any Ethereum or Solana wallet to curate your gallery.
            </p>
          </div>

          {/* Input Form */}
          <form 
            onSubmit={handleSubmit} 
            className="space-y-4 transition-all duration-700 ease-out"
            style={{
              opacity: isPageLoaded ? 1 : 0,
              transform: isPageLoaded ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '200ms',
            }}
          >
            <div className="relative">
              <Input
                type="text"
                placeholder="0x… / vitalik.eth / Solana address / .sol (comma-separate for multi-wallet)"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  if (validationError) setValidationError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit(e as any);
                  }
                }}
                className={`w-full h-14 px-6 text-center bg-card border-border focus:border-foreground transition-colors ${
                  validationError ? 'border-destructive focus:border-destructive' : ''
                }`}
              />
              {validationError && (
                <p className="text-sm text-destructive mt-2 text-center font-light">
                  {validationError}
                </p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 font-medium tracking-wide transition-all"
            >
              View Collection
            </Button>
          </form>

          {/* Example Link */}
          <div 
            className="text-center transition-all duration-700 ease-out"
            style={{
              opacity: isPageLoaded ? 1 : 0,
              transform: isPageLoaded ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '400ms',
            }}
          >
            <div className="flex items-center gap-4 justify-center flex-wrap">
              <button
                onClick={handleExampleWallet}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light inline-flex items-center gap-2 group"
              >
                <Sparkles className="w-3.5 h-3.5 transition-all" />
                <span className="border-b border-muted-foreground/30 group-hover:border-foreground/50 transition-colors">
                  Try example wallet
                </span>
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => navigate('/setup')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light inline-flex items-center gap-2 group"
              >
                <span className="border-b border-muted-foreground/30 group-hover:border-foreground/50 transition-colors">
                  📺 Display on a TV
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Pro Waitlist Modal */}
      {showProWaitlist && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowProWaitlist(false)}>
          <div
            className="bg-background border border-border/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'fadeInScale 0.2s ease-out' }}
          >
            <div className="p-8 space-y-6">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/5 border border-border/50">
                  <span className="text-xs font-medium tracking-wider uppercase">Coming Soon</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">DisToken Pro</h2>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Offline event packs, playlist scheduling, multi-screen management, advanced analytics, and more.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  '📦 Offline event packs',
                  '📅 Playlist scheduling',
                  '🖥️ Multi-screen sync',
                  '📊 Visitor analytics',
                  '🎨 Custom branding',
                  '🔗 API access',
                ].map(feature => (
                  <div key={feature} className="flex items-center gap-1.5 text-muted-foreground px-2 py-1.5 rounded-lg bg-accent/30">
                    {feature}
                  </div>
                ))}
              </div>

              <form onSubmit={handleProWaitlist} className="space-y-3">
                <input
                  type="email"
                  value={proEmail}
                  onChange={e => setProEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full h-12 px-4 text-center text-sm rounded-lg border border-border bg-card focus:border-foreground focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={proSubmitted}
                  className={`w-full h-12 rounded-lg text-sm font-medium tracking-wide transition-all ${
                    proSubmitted
                      ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                      : 'bg-foreground text-background hover:bg-foreground/90'
                  }`}
                >
                  {proSubmitted ? '✓ You\'re on the list' : 'Get Early Access'}
                </button>
              </form>
            </div>

            <div className="border-t border-border/30 px-8 py-4">
              <p className="text-xs text-muted-foreground/50 text-center font-light">
                Free version stays free forever. Pro adds power features for galleries and collectors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/30 py-6">
        <div className="container">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p className="font-light">
              Built by{' '}
              <a 
                href="https://x.com/EzvenG" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline decoration-1 underline-offset-2"
              >
                Ezven.eth
              </a>
            </p>
            <button
              onClick={() => setShowProWaitlist(true)}
              className="font-light hover:text-foreground transition-colors"
            >
              Pro Features
            </button>
            <p style={{ fontWeight: 200 }}>V.2 — Ethereum + Solana</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
