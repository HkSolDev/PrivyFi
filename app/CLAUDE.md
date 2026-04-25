# PrivyFi AI Context & Development Log

This file serves as the memory and architectural guide for development agents working on PrivyFi.

## Project Overview
PrivyFi is a premium, private, AI-powered yield optimization dashboard on Solana. It allows users to track their portfolios (Zerion integration), get AI-driven yield advice (OpenRouter/Llama integration), and deposit into pools (Kamino integration) with a "Private Mode" toggle (MagicBlock integration).

## Tech Stack
- **Smart Contract**: Solana Anchor (Rust)
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS v4
- **State Management**: React Context (Wallet), Local State (View Toggles)
- **Design System**: Custom Glassmorphism + PostCSS (@tailwindcss/postcss)

## Completed Milestones

### Phase 2: Core Program Logic (Complete)
- **Instructions**: `initialize_user`, `initialize_pool`, `deposit`, `withdraw`, `record_action`, `toggle_private`.
- **Modular Rewards**: Implemented an internal helper `add_point` in the `UserReward` state. This avoids redundant CPIs by allowing direct mutation from both `deposit` and `record_action` instructions.
- **PDA Security**: Seeds derived from `user.key()`. Signer constraints ensure only the wallet owner can mutate their profile or reward state.
- **Deployment**: Configured for Solana Devnet.

### Phase 3: Frontend Foundation (Complete)
- **Initialization**: Next.js app initialized with shadcn/ui and custom PostCSS adapter for Tailwind v4.
- **Design Foundation**: Established `globals.css` with a "Purple Nebula" theme. Fixed visibility issues by forcing dark-theme CSS variables as defaults.
- **Wallet Integration**: `WalletContextProvider.tsx` configured for Devnet/Mainnet with Solflare support.
- **Architecture**: Using a **Single-Page View Toggle** pattern to maintain the wallet session across Dashboard, Portfolio, and Yield views.

### Phase 4: Real-Time Integrations & Infrastructure (In Progress)
- **QuickNode RPC**: Switched from default Helius to high-performance **QuickNode Devnet RPC**. Eligible for QuickNode track. ✅
- **Anchor Program Bridge**: Created `useAnchorProgram` hook and imported IDL to `src/idl/`. Ready for on-chain execution. ✅
- **Portfolio (Zerion + RPC)**: Created `usePortfolio` hook. Implemented a **Direct Solana RPC Fallback** (with SPL token support) for Devnet. ✅
- **AI Advisor (OpenRouter)**: Integrated **Llama 3.3 70B**. AI has real-time portfolio context. ✅
- **Yield Aggregator (Meteora)**: Created `useYield` hook fetching live pools from Meteora DLMM API. ✅

## Development Patterns to Maintain
1. **QuickNode First**: Use `NEXT_PUBLIC_QUICKNODE_RPC_URL` for all on-chain connections.
2. **Anchor Patterns**: Use the `useAnchorProgram` hook for all instruction calls.
3. **Security-First APIs**: Access all keys via server-side proxies.

## Current Task
- Implementing the `handleDeposit` logic in `YieldView`.
- Integrating **MagicBlock Ephemeral Rollups**.
- Building the **PrivacyView**.

## Lookup & References
- **Program ID**: `Czmhx4o5349ugHqTjNEArm6eoakk2btihu4bcBCvdt36`
- **QuickNode RPC**: `NEXT_PUBLIC_QUICKNODE_RPC_URL`
- **Anchor Hook**: `app/src/hooks/useAnchorProgram.ts`
- **Yield Source**: `app/src/app/api/yield/route.ts`
- **Portfolio Hook**: `app/src/hooks/usePortfolio.ts`
