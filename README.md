# DisToken 🖼️

**The ultimate NFT display tool.** Enter any wallet. Display art on any screen. No downloads, no Canva, no right-click saving.

Built for Ethereum + Solana • Works on any TV, projector, or monitor • Zero friction

🔗 **Live:** [distoken.art](https://www.distoken.art)

---

## The Problem

There is no clean, efficient way to display NFTs. Every existing solution is broken:

- **Hardware frames** (Tokenframe, Infinite Objects) — $300-2000, [literally bricked when the company stopped paying servers](https://www.niftyist.com/post/how-to-un-brick-your-tokenframe). Video playback at 1 FPS. Limited chain support.
- **Manual workflow** — Download images, open Canva, fix aspect ratios, create a loop, export a video. You lose the name, the description, the on-chain metadata. Everything that makes an NFT an NFT gets stripped away.
- **Marketplaces** — OpenSea pivoted to licensing. Nifty Gateway shut down. LG Art Lab shut down. None of them focused on *displaying* art.
- **Samsung The Frame** — Doesn't even support NFTs natively. Needs third-party apps.

The art people paid for is sitting in wallets with nowhere beautiful to show it.

## The Solution

DisToken is a **display pipeline**, not a gallery page:

```
Wallet address → Token discovery → Metadata normalization → Media detection → Smart display → Any screen
```

Enter any wallet address or ENS/.sol domain. DisToken fetches the entire collection, detects media types, and displays everything at its maximum potential — with the metadata preserved.

---

## Features

### Display Intelligence
- **Video & animation support** — MP4, WebM, GIF NFTs play natively with smooth browser-powered rendering. No choppy 1 FPS playback.
- **Blurred palette backgrounds** — Non-matching aspect ratios get a color-matched ambient background sampled from the artwork. No dead black bars.
- **Media-type aware** — Images, videos, and animated NFTs each rendered with the right approach automatically.

### Kiosk / TV Mode
- **`?mode=kiosk`** — Append to any wallet URL for zero-chrome display. Just art, ambient background, smooth transitions.
- **Cursor auto-hides** after 3 seconds. Controls appear on hover/tap.
- **Open on any smart TV browser**, Chromecast, Fire Stick, or projector. Set it and forget it.
- **No hardware dependency** — A URL can't be bricked.

### Metadata Preservation
- **Toggle info overlay** (press `I`) — piece name, artist, collection, description. The on-chain data that makes NFTs valuable stays with the art.
- **Your choice** — Show the full museum card or pure art. Global toggle.

### Curation
- **Collection filter** — Filter by collection name. Whale with 500 NFTs? Show just your Art Blocks or just your Opepen.
- **Pin favorites** — Pin NFTs to the front of the slideshow.
- **Hide unwanted** — Remove spam or pieces you don't want displayed. Persists in localStorage.
- **Solana spam filter** — Automatically filters burned tokens, phishing airdrops, and scam NFTs.

### Public Galleries (No Wallet Connection Needed)
- Enter `punk6529.eth` — browse the entire 6529 museum.
- Enter any Solana address or `.sol` domain — view their collection instantly.
- **Shareable URLs** — `distoken.art/vitalik.eth` works as a direct link.
- One of the best things about NFTs is you can admire other collectors' art without permission. DisToken makes that effortless.

### Multi-Chain
- **Ethereum** — via Alchemy (mainnet, ENS support)
- **Solana** — via Helius DAS (mainnet, .sol domain support, compressed NFTs)

---

## Quick Start

```bash
git clone https://github.com/Ferxxo-pa/DisToken.git
cd DisToken
npm install
cp .env.example .env
# Add your API keys
npm run dev
```

### Environment Variables

```
VITE_ALCHEMY_API_KEY=your_alchemy_key    # Ethereum NFTs
VITE_HELIUS_API_KEY=your_helius_key      # Solana NFTs
```

### Deploy to Vercel

```bash
npx vercel
```

Set both API keys in your Vercel project environment variables.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` `→` | Previous / Next |
| `Space` | Play / Pause |
| `F` | Toggle Fullscreen |
| `I` | Toggle Info Overlay |
| `Esc` | Exit Fullscreen |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS + Radix UI |
| Animations | Framer Motion |
| ETH NFTs | Alchemy NFT API v2 |
| Solana NFTs | Helius DAS (getAssetsByOwner) |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── components/
│   └── NFTSlideshow.tsx    # Display engine — slideshow, kiosk, blurred bg, video
├── pages/
│   ├── Home.tsx            # Landing + wallet input
│   └── NotFound.tsx
├── lib/
│   ├── nft.ts              # Multi-chain fetching, media detection, spam filter
│   ├── config.ts           # Environment config
│   └── utils.ts
├── hooks/
│   ├── useComposition.ts
│   └── usePersistFn.ts
└── App.tsx                 # Routing + kiosk mode param
```

---

## The Origin Story

> I first ran into this problem when I wanted to display some of @raoulgmi's pieces from the Culture Vault for a Real Vision event. I found myself right-click saving.
>
> I ran into it again in Marfa while hosting a small art activation for @ttu_waa. I wanted to display several pieces from our club wallet on a CRT TV. To do that, I had to create a Canva, import the art, fix aspect ratios, create a loop, export a video. And even then, you lose depth. You lose the name. You lose the description. You lose the on-chain metadata.
>
> Wallets are basically just digital closets. How do we get art out of the closet?

---

## Roadmap

- [x] Multi-chain support (Ethereum + Solana)
- [x] Video/animation playback
- [x] Kiosk/TV mode
- [x] Blurred palette backgrounds
- [x] Collection filtering
- [x] Metadata toggle
- [x] Spam filtering
- [ ] Smart framing presets (matte, museum white, edge extend)
- [ ] Offline event packs (cached assets + standalone HTML player)
- [ ] Playlist scheduling (timed rotations for venues)
- [ ] QR remote control (phone controls TV display)
- [ ] More chains (Base, Tezos, Polygon)

---

## Built For

🏆 **Solana Graveyard Hack 2026**

NFT galleries died. DisToken brought them back.

Built by [Ezven](https://x.com/EzvenG)

---

## License

MIT
