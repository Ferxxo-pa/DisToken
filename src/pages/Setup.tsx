import { Button } from "@/components/ui/button";
import { ArrowLeft, Monitor, Smartphone, Tv, Wifi } from "lucide-react";
import { useLocation } from "wouter";

const STEPS = [
  {
    device: "Samsung Smart TV",
    icon: "📺",
    steps: [
      "Open the built-in web browser on your Samsung TV",
      "Navigate to distoken.art",
      "Enter a wallet address and view the collection",
      "Click the fullscreen button (or press F) for kiosk display",
      "Tip: Bookmark the URL for quick access next time",
    ],
  },
  {
    device: "LG Smart TV",
    icon: "📺",
    steps: [
      "Open the LG web browser from the home screen",
      "Go to distoken.art",
      "Enter your wallet address",
      "Use kiosk mode: add ?mode=kiosk to the URL for zero-chrome display",
      "Tip: LG TVs support fullscreen in the browser — tap the expand icon",
    ],
  },
  {
    device: "Amazon Fire Stick",
    icon: "🔥",
    steps: [
      "Install the 'Silk Browser' or 'Firefox for Fire TV' from the Amazon App Store",
      "Open the browser and go to distoken.art",
      "Enter a wallet address",
      "Navigate to the collection and hit fullscreen",
      "Tip: Use the Fire Stick remote to navigate — arrow keys work for prev/next",
    ],
  },
  {
    device: "Chromecast / Google TV",
    icon: "📡",
    steps: [
      "On your phone or computer, open Chrome and go to distoken.art",
      "Enter a wallet and start the slideshow",
      "Click the three-dot menu in Chrome → 'Cast'",
      "Select your Chromecast device",
      "Your entire tab will mirror to the TV — go fullscreen for best results",
    ],
  },
  {
    device: "Apple TV (via AirPlay)",
    icon: "🍎",
    steps: [
      "On your iPhone, iPad, or Mac, open Safari and go to distoken.art",
      "Enter a wallet and start the slideshow",
      "Open Control Center and tap 'Screen Mirroring'",
      "Select your Apple TV",
      "Go fullscreen on your device — it mirrors to the TV",
      "Tip: On Mac, use AirPlay from the menu bar for better quality",
    ],
  },
  {
    device: "Roku",
    icon: "📺",
    steps: [
      "Use screen mirroring from your phone or laptop",
      "On Android: Settings → Connected Devices → Cast → Select Roku",
      "On Windows: Settings → System → Display → Connect to wireless display",
      "Open distoken.art in your browser and go fullscreen",
      "Tip: Roku doesn't have a native browser, so mirroring is the way",
    ],
  },
  {
    device: "Any Computer + HDMI",
    icon: "💻",
    steps: [
      "Connect your laptop/desktop to the TV via HDMI cable",
      "Open any browser and go to distoken.art",
      "Enter a wallet address",
      "Press F for fullscreen or add ?mode=kiosk to the URL",
      "Tip: This gives you the best quality — no compression from casting",
    ],
  },
  {
    device: "Raspberry Pi (DIY Kiosk)",
    icon: "🍓",
    steps: [
      "Install Raspberry Pi OS Lite on your Pi",
      "Install Chromium: sudo apt install chromium-browser",
      "Set up auto-start in kiosk mode:",
      "chromium-browser --kiosk --noerrdialogs distoken.art/YOUR_WALLET?mode=kiosk",
      "Connect to TV via HDMI — it boots directly into your gallery",
      "Tip: A Pi Zero 2 W ($15) is enough for image slideshows",
    ],
  },
];

const TIPS = [
  {
    title: "Best display quality",
    desc: "HDMI cable from a computer gives the highest quality — no compression from wireless casting.",
  },
  {
    title: "Portrait art on landscape TVs",
    desc: "DisToken automatically adds ambient blurred backgrounds so portrait art looks great on wide screens.",
  },
  {
    title: "Kiosk mode URL",
    desc: "Add ?mode=kiosk to any wallet URL for zero-chrome display. Example: distoken.art/vitalik.eth?mode=kiosk",
  },
  {
    title: "Keyboard shortcuts",
    desc: "← → to navigate, Space to pause, F for fullscreen, I for info, S for shuffle, M for mute.",
  },
  {
    title: "Prevent screen burn-in",
    desc: "Use slideshow mode with transitions — the constantly changing content prevents static burn-in on OLED TVs.",
  },
  {
    title: "Wi-Fi drops?",
    desc: "DisToken preloads upcoming images. Short Wi-Fi drops won't interrupt your slideshow.",
  },
];

export default function Setup() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}
              className="border-border/50 hover:bg-accent font-light">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-lg font-medium tracking-tight">Display Setup Guide</h1>
              <p className="text-xs text-muted-foreground font-light">Get DisToken running on any screen</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Tv className="h-8 w-8 text-muted-foreground" />
            <Monitor className="h-8 w-8 text-muted-foreground" />
            <Smartphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight mb-2">
            DisToken works on any screen
          </h2>
          <p className="text-muted-foreground font-light max-w-xl mx-auto">
            No app to install. No hardware to buy. Just a URL.
            Here's how to set it up on every major device.
          </p>
        </div>

        {/* Device guides */}
        <div className="space-y-6 mb-16">
          {STEPS.map((device, i) => (
            <details key={i} className="group border border-border/30 rounded-lg overflow-hidden">
              <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                <span className="text-2xl">{device.icon}</span>
                <span className="font-medium text-sm flex-1">{device.device}</span>
                <span className="text-muted-foreground text-xs group-open:rotate-90 transition-transform">▶</span>
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-border/20">
                <ol className="space-y-2">
                  {device.steps.map((step, j) => (
                    <li key={j} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground font-mono text-xs mt-0.5 shrink-0">{j + 1}.</span>
                      <span className={`font-light ${step.startsWith('Tip:') ? 'text-muted-foreground italic' : ''}`}>
                        {step.startsWith('Tip:') ? (
                          <><span className="not-italic">💡</span> {step.replace('Tip: ', '')}</>
                        ) : step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>

        {/* Pro tips */}
        <div className="mb-12">
          <h3 className="text-lg font-medium tracking-tight mb-6 flex items-center gap-2">
            <Wifi className="h-5 w-5" /> Display Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TIPS.map((tip, i) => (
              <div key={i} className="border border-border/30 rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium">{tip.title}</p>
                <p className="text-xs text-muted-foreground font-light">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick start */}
        <div className="text-center border border-border/30 rounded-lg p-8 bg-card">
          <h3 className="text-lg font-medium mb-2">Quick Start</h3>
          <p className="text-sm text-muted-foreground font-light mb-4">
            The fastest way to display your NFTs on a TV:
          </p>
          <code className="text-sm bg-muted px-4 py-2 rounded font-mono">
            distoken.art/YOUR_WALLET?mode=kiosk
          </code>
          <p className="text-xs text-muted-foreground font-light mt-3">
            Open this URL on any device connected to a screen. That's it.
          </p>
        </div>
      </main>
    </div>
  );
}
