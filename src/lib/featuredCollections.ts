export interface FeaturedCollection {
  slug: string;
  name: string;
  contract: string;
  description: string;
  chain: "ethereum";
  emoji: string;
}

export const FEATURED_COLLECTIONS: FeaturedCollection[] = [
  { slug: "cryptopunks", name: "CryptoPunks", contract: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB", description: "The OG. 10,000 unique punks on Ethereum.", chain: "ethereum", emoji: "👾" },
  { slug: "the-memes", name: "The Memes by 6529", contract: "0x33FD426905F149f8376e227d0C9D3340AaD17aF1", description: "Open edition culture. 6529's flagship collection.", chain: "ethereum", emoji: "🧠" },
  { slug: "art-blocks", name: "Art Blocks Curated", contract: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270", description: "On-chain generative art. The gold standard.", chain: "ethereum", emoji: "🎨" },
  { slug: "pudgy-penguins", name: "Pudgy Penguins", contract: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8", description: "The comeback kids. IP expansion done right.", chain: "ethereum", emoji: "🐧" },
  { slug: "nouns", name: "Nouns DAO", contract: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", description: "One noun per day, forever. On-chain governance.", chain: "ethereum", emoji: "⌐◨-◨" },
];
