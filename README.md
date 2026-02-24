# DisToken 🖼️

**Showcase your NFTs. Enter any Ethereum wallet. Watch the gallery.**

Enter an Ethereum address or ENS name. DisToken pulls your entire NFT collection and displays it as a cinematic slideshow — fullscreen, auto-play, gallery grid, adjustable speed.

Built by [Ezven.eth](https://x.com/EzvenG).

---

## Quick Start

```bash
git clone https://github.com/Ferxxo-pa/DisToken.git
cd DisToken
npm install
cp .env.example .env
# Add your Alchemy API key
npm run dev
```

## Setup

1. Get a free Alchemy API key at [alchemy.com](https://alchemy.com)
2. Add to `.env`: `VITE_ALCHEMY_API_KEY=your_key`
3. Run `npm run dev`

## Deploy to Vercel

```bash
npx vercel
```

Set `VITE_ALCHEMY_API_KEY` in your Vercel project environment variables.

---

## Features

- **Slideshow** — auto-advancing NFT display with framer-motion transitions
- **Fullscreen** — cinematic fullscreen mode with hover controls
- **Gallery grid** — view all NFTs at once, click to jump
- **Speed controls** — slow / normal / fast / very fast
- **ENS support** — enter `vitalik.eth` or any ENS name
- **Keyboard nav** — arrow keys, spacebar, F for fullscreen

## Tech Stack

- React + Vite + TypeScript
- Framer Motion
- Alchemy NFT API (Ethereum mainnet)
- Tailwind CSS + Radix UI

---

Built for **Graveyard Hack 2026** — NFT galleries died. DisToken brought them back.
