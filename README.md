# PrivyFi

> AI-powered DeFi yield advisor on Solana — find the best APY, simulate deposits, and hide your positions with on-chain privacy.

---

## What Is PrivyFi?

PrivyFi is a hackathon project built for **Solana Frontier (May 2026)**. Connect your Solflare wallet, let the AI read live Kamino pool data, and get a plain-English recommendation on where to put your USDC for the best yield — then simulate a deposit on devnet with one click. Toggle **Private Mode** to hide your position from public blockchain view using MagicBlock's Ephemeral Rollups.

**Real data. Devnet execution. $0 cost.**

---

## Features

| Feature | Status |
|---------|--------|
| 🔗 Solflare wallet connect + .sol SNS domains | Week 2 |
| 📊 Live portfolio via Zerion API (mainnet read) | Week 2 |
| 🌊 Live Kamino APY data (mainnet read) | Week 2 |
| 🤖 AI yield advisor via Llama 3.3 (OpenRouter free) | Week 2 |
| 💰 Simulated USDC deposit/withdraw on devnet | Week 1 |
| 🔒 Private Mode via MagicBlock PER | Week 2 |
| 🎯 Mock reward points (Torque-style) | Week 2 |

---

## Architecture

```
User (browser)
  │ connects wallet
  ▼
Solflare SDK ──────────────────────────────────┐
  │ wallet pubkey                              │
  ▼                                            │
Zerion API (mainnet read)                      │
  │ token balances                             │
  ▼                                            │
Dashboard (React)                              │
  │ user asks: "where to put 1000 USDC?"      │
  ▼                                            │
Vercel Serverless /api/ai                      │
  ├── Kamino API → live APY data               │
  ├── Jupiter Price API → token prices         │
  └── OpenRouter (Llama 3.3) → AI response    │
  ▼                                            │
AI Recommendation shown to user               │
  │ user clicks "Deposit"                     │
  ▼                                            │
Anchor Program (devnet) ◄──────────────────────┘
  ├── deposit       → fake USDC → MockPool PDA
  ├── withdraw      → MockPool PDA → user wallet
  ├── record_action → increment UserRewards.points
  └── toggle_private → MagicBlock PER hide/show
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Rust + Anchor 1.0 |
| Frontend | React + TypeScript |
| Hosting | Vercel (serverless functions + static) |
| Wallet | Solflare SDK + `@solana/wallet-adapter` |
| AI | OpenRouter → `meta-llama/llama-3.3-70b-instruct:free` |
| Yield Data | Kamino Finance API (public, no key) |
| Portfolio | Zerion API (free tier) |
| Prices | Jupiter Price API (no key needed) |
| Privacy | MagicBlock Ephemeral Rollups SDK |
| RPC | Helius (devnet, free tier) |

---

## Anchor Program — Accounts

```
MockPool PDA        seeds: ["mock_pool", pool_name]
UserPosition PDA    seeds: ["position", owner, pool]
UserRewards PDA     seeds: ["rewards", owner]
UserProfile PDA     seeds: ["profile", owner]
```

## Anchor Program — Instructions

```
1. initialize_user   → creates UserProfile + UserRewards PDAs
2. initialize_pool   → creates MockPool PDA (admin only)
3. deposit           → transfers fake USDC to pool vault, creates UserPosition
4. withdraw          → returns fake USDC to user, closes UserPosition
5. toggle_private    → flips private_mode bool, calls MagicBlock PER
6. record_action     → increments UserRewards.points
```

---

## Project Structure

```
privyfi/
├── programs/privyfi/src/
│   ├── lib.rs
│   ├── instructions/          ← 6 instruction handlers
│   ├── state/                 ← 4 account structs
│   └── errors.rs
├── app/
│   ├── api/                   ← Vercel serverless (AI, Zerion, Kamino)
│   └── src/
│       ├── components/        ← 7 React components
│       ├── hooks/             ← 6 custom hooks
│       └── utils/             ← airdrop, tokens, rewards helpers
├── tests/privyfi.ts
├── scripts/setup-devnet.ts
├── Anchor.toml
└── .env.example
```

---

## Getting Started

### Prerequisites
- Rust + Cargo
- Anchor CLI 1.0
- Solana CLI 1.18+
- Node.js 18+

### Setup

```bash
# Clone
git clone https://github.com/HkSolDev/PrivyFi.git
cd PrivyFi

# Configure devnet
solana config set --url devnet
solana airdrop 2

# Build Anchor program
anchor build

# Test the program
anchor test

# Deploy to devnet
anchor deploy

# Copy env and fill in your keys
cp .env.example .env
```

### Environment Variables

```bash
OPENROUTER_API_KEY=your_key_here
ZERION_API_KEY=your_key_here
HELIUS_API_KEY=your_key_here
NEXT_PUBLIC_PROGRAM_ID=<deployed_program_id>
NEXT_PUBLIC_FAKE_USDC_MINT=<devnet_usdc_mint>
```

Free API keys: [Zerion](https://zerion.io/api) · [Helius](https://helius.dev) · [OpenRouter](https://openrouter.ai) · Jupiter & MagicBlock need no key.

---

## License

MIT
