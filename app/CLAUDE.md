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

### Phase 4: Real-Time Integrations & UX Excellence (In Progress)
- **QuickNode RPC Integration**: Switched to QuickNode Devnet RPC. 
  - *Why*: To ensure zero-latency blockchain reads and qualify for the QuickNode hackathon track. ✅
- **AI Yield Advisor (Llama 3.3 / Qwen)**: Integrated via OpenRouter. 
  - *Why*: To provide "context-aware" investment advice. The AI knows the user's balance and the pool's live APY. ✅
- **AI Knowledge Pop-up (Modal)**: Created a detailed deep-dive modal for every yield pool.
  - *Why*: Beginners don't understand "Liquidity Providing." The modal explains it in simple terms with an AI-generated "PrivyFi Score." ✅
- **Professional Markdown Rendering**: Integrated `react-markdown` and `@tailwindcss/typography`.
  - *Why*: Raw AI text is messy. Formatted text with purple highlights (prose) makes the advice feel premium and authoritative. ✅
- **Scalable Yield Scanner**: Expanded the API to show 30+ pools from Meteora.
  - *Why*: To give users the widest range of opportunities across SOL, Stables, and high-yield tokens. ✅

## Development Patterns to Maintain
1. **QuickNode First**: Use `NEXT_PUBLIC_QUICKNODE_RPC_URL` for all on-chain connections.
2. **Premium AI UX**: Always render AI output via the `<ReactMarkdown>` component inside a `.prose` container.
3. **Context-Driven Prompting**: When calling the AI, always include the relevant pool data (name, apy, protocol) and user context (portfolio).
4. **Security-First APIs**: Access all keys via server-side proxies (`/api/*`).

## Current Task
- **The Execution Layer**: Connecting the "Start Earning" button in the modal to the Anchor `deposit` instruction.
- **MagicBlock Rollups**: Integrating ephemeral rollups for the privacy toggle.
- **PUSD Integration**: Adding Palm USD support.

## Lookup & References
- **Program ID**: `Czmhx4o5349ugHqTjNEArm6eoakk2btihu4bcBCvdt36`
- **QuickNode RPC**: `NEXT_PUBLIC_QUICKNODE_RPC_URL`
- **Anchor Hook**: `app/src/hooks/useAnchorProgram.ts`
- **AI Modal**: `app/src/components/modals/YieldDetailsModal.tsx`
- **Markdown Config**: `react-markdown` + `prose` classes in `page.tsx` and `YieldDetailsModal.tsx`.
- **Yield Logic**: `app/src/app/api/yield/route.ts`
