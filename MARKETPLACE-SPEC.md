# DisToken Marketplace Features — Spec
## Date: March 8, 2026

---

## Overview

Expanding DisToken from a **display-only** NFT viewer into a **display + commerce** platform. Three major features:

1. **Floor Price Display** — Show live floor prices on NFTs
2. **Connect Wallet + Buy/Sell** — Native marketplace integration
3. **Featured Collections** — Curate and display famous collections (The Memes by 6529, etc.)
4. **Auction/Bidding** — IR auction or bidding system on the customize page

---

## Feature 1: Floor Price Overlay

**What:** Live floor price badges on artwork during display and in the gallery grid.

**Implementation:**
- Fetch floor price data per collection from:
  - **Ethereum/EVM:** Alchemy `getFloorPrice()` API or Reservoir API
  - **Solana:** Helius/Magic Eden API
  - **Ordinals:** Hiro / Magic Eden Ordinals API
- Display as overlay badge on artwork: `Ξ 0.42` or `◎ 2.1 SOL`
- Position: bottom-right corner, semi-transparent pill badge
- Toggle on/off in Settings
- In gallery grid view: show floor price under each NFT
- In slideshow: subtle badge that fades in/out with the art

**UI:**
```
┌──────────────────────┐
│                      │
│      [NFT ART]       │
│                      │
│              Ξ 0.42  │  ← floor price badge
└──────────────────────┘
```

**Data refresh:** Every 5 minutes, cached in localStorage.

---

## Feature 2: Connect Wallet + Buy/Sell

**What:** Users connect their wallet to buy NFTs directly from the display view.

**Implementation:**
- **Wallet connection:** Use RainbowKit or Dynamic for EVM, Solana wallet adapter for SOL
- **Buy flow:**
  - If NFT is listed on a marketplace (OpenSea, Blur, Magic Eden), show "Buy Now" button
  - Use Reservoir SDK (aggregates all EVM marketplace listings) or Magic Eden SDK (Solana)
  - Execute purchase transaction directly — no redirect needed
- **Sell flow (future):**
  - If viewer owns the NFT (connected wallet matches), show "List for Sale" option
  - Create listing on OpenSea/Blur via Reservoir SDK
  - Set price, duration, accept offers

**UX flow:**
```
User views NFT → sees "Ξ 0.42 Floor" badge
→ Clicks NFT → Detail panel slides in
→ Shows: price, collection, traits, "Buy Now" button
→ Connects wallet → Confirms transaction → NFT purchased
```

**Key decision:** Start with **buy-only** (simpler, read marketplace listings + execute). Add sell/list later.

---

## Feature 3: Featured Collections

**What:** Browse and display famous NFT collections without needing a wallet address.

**Implementation:**
- Curated list of collections accessible from homepage/explore page:
  - **The Memes by 6529** (Ethereum)
  - **Art Blocks** curated
  - **Fidenza** by Tyler Hobbs
  - **CryptoPunks**
  - **Pudgy Penguins**
  - **Mad Lads** (Solana)
  - **Bitcoin Puppets** (Ordinals)
  - User-submitted collections (future)

- **Routes:**
  - `/collections` — Browse featured collections grid
  - `/collection/the-memes-by-6529` — Full collection display
  - `/collection/0x33FD...` — Any collection by contract address

- **Data source:**
  - Alchemy `getNFTsForCollection()` — paginated, all tokens
  - Include: floor price, total supply, unique holders, volume

- **Display:**
  - Same display engine as wallet view (slideshow, gallery grid, all customization)
  - Collection info header: name, artist, description, stats
  - Sort by: token ID, rarity, price

---

## Feature 4: Auction/Bidding (Customize Page Integration)

**What:** Enable auctions and bidding on displayed NFTs. Integrates into the customize/detail page.

**Implementation options:**

### Option A: Marketplace Integration (Recommended for V1)
- Pull existing bids/offers from OpenSea/Blur via Reservoir API
- Show current highest bid, bid history
- "Place Bid" button → creates offer via Reservoir SDK
- "Accept Bid" for owners
- Display on customize page:
  ```
  ┌─ NFT Detail ─────────────────────┐
  │ [Image]     Collection: Memes    │
  │             Floor: Ξ 0.42        │
  │             Highest Bid: Ξ 0.38  │
  │             Last Sale: Ξ 0.55    │
  │                                   │
  │  [Buy Now Ξ 0.42] [Place Bid]   │
  │                                   │
  │  Bid History:                     │
  │  0.38 ETH — 0x7a3...2h ago      │
  │  0.35 ETH — 0x9b1...5h ago      │
  └───────────────────────────────────┘
  ```

### Option B: Native Auction System (V2 — requires smart contract)
- Deploy auction contract on Base
- Sellers create timed auctions (English auction, Dutch auction)
- IR auction (increasing reserve) — price goes UP over time
- Bidders compete, winner gets NFT transferred
- Revenue model: small platform fee (1-2.5%)

**Recommendation:** Start with **Option A** (marketplace aggregation). Ships faster, no contract needed, leverages existing liquidity. Build native auctions as V2 when there's traction.

---

## Priority Order

| Phase | Feature | Effort | Impact |
|-------|---------|--------|--------|
| **Now** | Floor Price Overlay | 2-3 days | High — makes display useful for collectors |
| **Next** | Featured Collections | 3-4 days | High — drives traffic without wallet requirement |
| **Then** | Connect Wallet + Buy | 5-7 days | Very High — revenue + stickiness |
| **Later** | Auction/Bidding | 7-14 days | High — differentiator, revenue |

---

## Revenue Model (with marketplace features)

- **Affiliate fees:** Reservoir/OpenSea affiliate program pays 0.5-1% on sales referred
- **Platform fee:** 1-2.5% on native auctions (V2)
- **Premium features:** Floor price alerts, portfolio tracking, multi-screen sync
- **Gallery subscriptions:** Custom branding, event packs, extended display

---

## Tech Additions Needed

- `@reservoir-tools/sdk` — Marketplace aggregation (buy, sell, bid, floor prices)
- `@rainbow-me/rainbowkit` + `wagmi` + `viem` — Wallet connection (EVM)
- `@solana/wallet-adapter-react` — Wallet connection (Solana)
- Alchemy `getNFTsForCollection()` — Collection browsing
- WebSocket for live price updates (optional, V2)

---

*Spec by Clawdez — ready for implementation on Ez's go.*
