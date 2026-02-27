# DisToken

**Display your NFTs on any screen. No app, no hardware — just a URL.**

Enter any Ethereum or Solana wallet address and get an instant, beautiful art gallery that works on TVs, tablets, monitors, digital frames, and phones.

> "A URL can't be bricked." — Unlike hardware frames that go dark (RIP Tokenframe), DisToken is open, web-based, and yours forever.

## Features

### Display
- **Multi-chain** — Ethereum, Solana, Base, Polygon, Arbitrum, Optimism, Tezos, and Bitcoin Ordinals
- **Multi-wallet** — Comma-separate addresses to merge collections
- **5 backgrounds** — Blur fill, dark, light, color-match, custom color
- **5 frame styles** — None, minimal, gallery white mat, modern shadow, ornate gold
- **4 transitions** — Fade, slide, zoom, crossfade
- **Custom speed** — 5 presets (1.5s–15s) or drag the slider for any speed 1–30s
- **Dark/light mode** — Toggle with D key or button
- **Fullscreen** — Native Fullscreen API, controls auto-hide
- **Kiosk mode** — `?mode=kiosk` for zero-chrome TV display

### Media Support
- Images (PNG, JPG, GIF, WebP, SVG)
- Video (MP4, WebM) with autoplay
- Audio NFTs (cover art + playback)
- Generative art (iframe rendering)
- Pixel art auto-detection (crisp rendering for ≤128px artwork)

### Curation
- **Gallery grid** — Browse all NFTs, jump to any piece
- **Pin & hide** — Pin favorites to front, hide what you don't want
- **Collection filter** — Filter by collection name
- **Smart groups** — Auto-sort by artist, chain, or media type
- **Playlists** — Create named playlists, add from gallery grid
- **Shuffle mode** — Randomize display order
- **Name on switch** — Show NFT name and collection on every transition

### Tools
- **Phone remote** — Control TV display from your phone via room code (no app)
- **Zoom** — Click artwork to zoom, scroll/pinch to magnify, drag to pan
- **Embed widget** — Generate iframe code to embed gallery on any website
- **Download** — Full-resolution NFT download with CORS fallback
- **Share links** — Copy shareable gallery URLs
- **Kiosk link** — Ready-to-use kiosk URL in settings
- **Visitor analytics** — View count, sessions, dwell time (localStorage)
- **Offline cache** — Service worker caches up to 200 images
- **PWA** — Install as native app on any device

### First-Time Experience
- **12-step walkthrough** — Explains every feature on first visit
- **Feature tour button** — Re-trigger anytime from settings

## Quick Start

**1. Enter your wallet address** on [distoken.art](https://distoken.art) — or go directly:
```
https://distoken.art/YOUR_WALLET_ADDRESS
```

**2. Customize** — click the ⚙ Settings gear to adjust speed, transitions, backgrounds, and more.

**3. Kiosk mode (TV/digital frame):**
```
https://distoken.art/YOUR_WALLET_ADDRESS?mode=kiosk
```
Open this URL on any device connected to a screen. That's it — zero chrome, just art.

Find the ready-to-copy kiosk link in **⚙ Settings → Tools → Kiosk Link**.

**Embed:**
```html
<iframe src="https://distoken.art/YOUR_WALLET?embed=true" width="800" height="600" />
```

**Supported wallets:** Ethereum (0x… / .eth), Solana (.sol), Tezos (tz… / .tez), Bitcoin (bc1… / 1… / 3…). EVM address automatically fetches from Ethereum + Base + Polygon + Arbitrum + Optimism.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← → | Navigate |
| Space | Play/Pause |
| F | Fullscreen |
| I | Toggle info |
| S | Toggle shuffle |
| D | Toggle dark mode |
| M | Mute |
| Esc | Exit zoom/fullscreen |

## TV Setup

Works on every major device — Samsung, LG, Fire Stick, Chromecast, Apple TV, Roku, Raspberry Pi, or any computer + HDMI. See the in-app setup guide at `/setup`.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + Radix UI
- Framer Motion
- wouter (routing)
- Alchemy API (Ethereum + Base + Polygon + Arbitrum + Optimism NFTs)
- Helius DAS API (Solana NFTs)
- TzKT API (Tezos NFTs)
- Hiro Ordinals API (Bitcoin Inscriptions)
- BroadcastChannel API (phone remote)
- Service Worker (offline cache)

## Environment Variables

```
VITE_ALCHEMY_API_KEY=    # Alchemy API key for Ethereum NFTs
VITE_HELIUS_API_KEY=     # Helius API key for Solana NFTs
VITE_FORMSPREE_ID=       # (Optional) Formspree form ID for waitlist
```

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # Production build → dist/
```

## Pro Roadmap

Coming soon for galleries, collectors, and power users:

- **Gallery wall mode** — 2×2, 3×3, 4×4 grid display
- **Floor price overlay** — Live floor price badges on artwork
- **Ambient soundscapes** — Brown noise, rain, gallery hum
- **Gesture control** — Camera-based hand gesture navigation
- **Offline event packs** — Pre-cached collections for events without Wi-Fi
- **Playlist scheduling** — Time-based rotation for installations
- **Custom branding** — Logo, colors, watermarks for galleries
- **Extended display time** — Longer sessions for premium users
- **Multi-screen sync** — Control multiple displays from one dashboard

## License

MIT

---

Built by [Ezven.eth](https://x.com/EzvenG)
