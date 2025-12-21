import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NFTSlideshow } from "@/components/NFTSlideshow";
import { fetchNFTsForWallet, type NFTCollection } from "@/lib/nft";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

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

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [nftData, setNftData] = useState<NFTCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Trigger page load animation
    setIsPageLoaded(true);
  }, []);

  useEffect(() => {
    if (activeWallet) {
      setIsLoading(true);
      setError(null);
      
      fetchNFTsForWallet(activeWallet)
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
    // Basic Ethereum address validation (0x + 40 hex chars) or ENS (.eth)
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
    const isValidENS = /^[a-zA-Z0-9-]+\.eth$/i.test(trimmed);
    
    if (!isValidAddress && !isValidENS) {
      setValidationError("Invalid wallet address or ENS name");
      return false;
    }
    
    setValidationError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAddress(walletAddress)) {
      const normalizedAddress = walletAddress.trim().toLowerCase();
    }
  };

  const handleExampleWallet = () => {
    const exampleAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    setWalletAddress(exampleAddress);
    setActiveWallet(exampleAddress);
  };

  const handleChangeWallet = () => {
    setActiveWallet(null);
    setWalletAddress("");
    setNftData(null);
    setError(null);
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
          onChangeWallet={handleChangeWallet}
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
              Enter any Ethereum wallet address to curate your gallery.
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
                placeholder="0x... or ENS name"
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
            <button
              onClick={handleExampleWallet}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light inline-flex items-center gap-2 group"
            >
              <Sparkles className="w-3.5 h-3.5 transition-all" />
              <span className="border-b border-muted-foreground/30 group-hover:border-foreground/50 transition-colors">
                Try example wallet
              </span>
            </button>
          </div>
        </div>
      </main>

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
            <p style={{ fontWeight: 200 }}>V.1 for Ethereum</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
