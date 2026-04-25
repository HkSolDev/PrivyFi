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

### Phase 3: Frontend Foundation (In Progress)
- **Initialization**: Next.js app initialized with a custom PostCSS adapter for Tailwind v4 compatibility.
- **Design Foundation**: Established `globals.css` with a "Purple Nebula" theme (Radial gradients + Glassmorphism).
- **Wallet Integration**: `WalletContextProvider.tsx` configured for Devnet with Solflare support.
- **Architecture**: Using a **Single-Page View Toggle** pattern. We swap view components (`activeTab` state) instead of full page reloads to ensure the **Solana Wallet session persists** without re-approval.

## Development Patterns to Maintain
1. **Design First**: Every component must adhere to the "Premium/State-of-the-Art" aesthetic. Use `.glass-card` and `.purple-glow` utility classes.
2. **Security First**: 
    - On-chain: Always use `checked_add`/`checked_sub` and proper `Signer` constraints.
    - Frontend: Keep API keys (Zerion/OpenRouter) in Next.js Server Actions or API routes, never in the client-side code.
3. **Modular State**: Keep the logic for specific views (Portfolio, Yield, AI Advisor) in separate components under `src/components/views/`.

## Current Task
- Initializing **shadcn/ui** for high-quality interactive components.
- Implementing the `activeTab` navigation logic to make the sidebar functional.
- Building the `PortfolioView` to display dummy/real token data.

## Lookup & References
- **Program ID**: `Czmhx4o5349ugHqTjNEArm6eoakk2btihu4bcBCvdt36`
- **Main Entry**: `programs/privyfi/src/lib.rs`
- **Main UI Entry**: `app/src/app/page.tsx`
- **Design Tokens**: `app/src/app/globals.css`
