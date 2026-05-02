// lib/model-personas.ts

export const SUGGEST_MODEL = "google/gemini-2.0-flash-001";

export const SWARM_MODELS = [
  // 🟢 Free / High Reliability
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "liquid/lfm-2.5-1.2b-thinking:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openrouter/owl-alpha",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "poolside/laguna-xs.2:free",
  "poolside/laguna-m.1:free",
  "inclusionai/ling-2.6-1t:free",
  "tencent/hy3-preview:free",
  "baidu/qianfan-ocr-fast:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/llama-nemotron-embed-vl-1b-v2:free",
  "minimax/minimax-m2.5:free",
  // 🔵 Google Gemini
  "google/gemini-2.0-flash-001",
  "google/gemini-2.0-flash-lite-001",
  "google/gemma-3-12b-it",
  // 🟣 Meta Llama
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.2-1b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
  "sao10k/l3-lunaris-8b",
  // 🔴 Mistral & Qwen
  "mistralai/mistral-small-24b-instruct-2501",
  "mistralai/mistral-nemo",
  "qwen/qwen-turbo",
  "qwen/qwen-2.5-7b-instruct",
  // 🟠 Enterprise
  "microsoft/phi-4",
  "cohere/command-r7b-12-2024",
  "amazon/nova-lite-v1",
  "amazon/nova-micro-v1",
  "rekaai/reka-flash-3",
  "gryphe/mythomax-l2-13b",
];

// ─── Types ────────────────────────────────────────────────────────────────────
export type Specialty = 'Risk' | 'Yield' | 'Speed' | 'Stable' | 'Deep';

export interface Persona {
  name: string;
  role: string;
  emoji: string;
  specialty: Specialty;
  color: string;
}

// ─── Specialty Badge Colors ───────────────────────────────────────────────────
export const SPECIALTY_STYLES: Record<Specialty, string> = {
  Risk:   'bg-blue-900/60   text-blue-300   border border-blue-700',
  Yield:  'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  Speed:  'bg-green-900/60  text-green-300  border border-green-700',
  Stable: 'bg-purple-900/60 text-purple-300 border border-purple-700',
  Deep:   'bg-red-900/60    text-red-300    border border-red-700',
};

// ─── Persona Map ──────────────────────────────────────────────────────────────
export const MODEL_PERSONAS: Record<string, Persona> = {

  // 🟢 Free Tier ───────────────────────────────────────────────────────────────
  "google/gemma-3-27b-it:free": {
    name: "Gemma Scout",
    role: "Risk Analyst",
    emoji: "🛡️",
    specialty: "Risk",
    color: "#4285F4",
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    name: "Alpha Hunter",
    role: "Yield Maximizer",
    emoji: "⚡",
    specialty: "Yield",
    color: "#F5A623",
  },
  "meta-llama/llama-3.2-3b-instruct:free": {
    name: "Swift Eye",
    role: "Speed Signal",
    emoji: "🏃",
    specialty: "Speed",
    color: "#7ED321",
  },
  "nousresearch/hermes-3-llama-3.1-405b:free": {
    name: "Hermes Oracle",
    role: "Deep Strategist",
    emoji: "🔮",
    specialty: "Deep",
    color: "#9B59B6",
  },
  "liquid/lfm-2.5-1.2b-thinking:free": {
    name: "Liquid Thinker",
    role: "Reasoning Engine",
    emoji: "🧠",
    specialty: "Deep",
    color: "#00BCD4",
  },
  "nvidia/nemotron-3-nano-30b-a3b:free": {
    name: "Nano Nemotron",
    role: "Nano Risk Probe",
    emoji: "🔬",
    specialty: "Risk",
    color: "#76B900",
  },
  "openrouter/owl-alpha": {
    name: "Owl Alpha",
    role: "Market Watcher",
    emoji: "🦉",
    specialty: "Yield",
    color: "#FF6F00",
  },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
    name: "Omni Reason",
    role: "Multi-Signal Analyst",
    emoji: "🌐",
    specialty: "Deep",
    color: "#76B900",
  },
  "poolside/laguna-xs.2:free": {
    name: "Laguna XS",
    role: "Compact Validator",
    emoji: "🏄",
    specialty: "Speed",
    color: "#26C6DA",
  },
  "poolside/laguna-m.1:free": {
    name: "Laguna M",
    role: "Pool Depth Scout",
    emoji: "🌊",
    specialty: "Stable",
    color: "#26C6DA",
  },
  "inclusionai/ling-2.6-1t:free": {
    name: "Ling Sage",
    role: "Trillion-Scale Analyst",
    emoji: "🧬",
    specialty: "Deep",
    color: "#E91E63",
  },
  "tencent/hy3-preview:free": {
    name: "Hunyuan HY3",
    role: "Mega-Scale Validator",
    emoji: "🐉",
    specialty: "Deep",
    color: "#1565C0",
  },
  "baidu/qianfan-ocr-fast:free": {
    name: "Qianfan Flash",
    role: "Fast Data Reader",
    emoji: "⚡",
    specialty: "Speed",
    color: "#2196F3",
  },
  "google/gemma-4-26b-a4b-it:free": {
    name: "Gemma 4 Spark",
    role: "Efficient Risk Checker",
    emoji: "✨",
    specialty: "Risk",
    color: "#4285F4",
  },
  "google/gemma-4-31b-it:free": {
    name: "Gemma 4 Pro",
    role: "Pro Yield Evaluator",
    emoji: "💎",
    specialty: "Yield",
    color: "#4285F4",
  },
  "nvidia/nemotron-3-super-120b-a12b:free": {
    name: "Super Nemotron",
    role: "Enterprise Risk Lead",
    emoji: "🏢",
    specialty: "Risk",
    color: "#76B900",
  },
  "nvidia/llama-nemotron-embed-vl-1b-v2:free": {
    name: "Embed Vision",
    role: "Visual Signal Probe",
    emoji: "👁️",
    specialty: "Speed",
    color: "#76B900",
  },
  "minimax/minimax-m2.5:free": {
    name: "MiniMax M",
    role: "Balanced Optimizer",
    emoji: "⚖️",
    specialty: "Stable",
    color: "#FF4081",
  },

  // 🔵 Google Gemini ────────────────────────────────────────────────────────────
  "google/gemini-2.0-flash-001": {
    name: "Flash Analyst",       // also used as SUGGEST_MODEL
    role: "Lead Suggestion Engine",
    emoji: "💡",
    specialty: "Yield",
    color: "#34A853",
  },
  "google/gemini-2.0-flash-lite-001": {
    name: "Lite Watcher",
    role: "Quick Signal",
    emoji: "🔭",
    specialty: "Speed",
    color: "#34A853",
  },
  "google/gemma-3-12b-it": {
    name: "Gemma Guard",
    role: "Risk Filter",
    emoji: "🔒",
    specialty: "Risk",
    color: "#4285F4",
  },

  // 🟣 Meta Llama ───────────────────────────────────────────────────────────────
  "meta-llama/llama-3.3-70b-instruct": {
    name: "Llama Prime",
    role: "Lead Strategist",
    emoji: "🦙",
    specialty: "Yield",
    color: "#0668E1",
  },
  "meta-llama/llama-3.2-1b-instruct": {
    name: "Llama Micro",
    role: "Quick Vote",
    emoji: "🎯",
    specialty: "Speed",
    color: "#0668E1",
  },
  "meta-llama/llama-3.1-8b-instruct": {
    name: "Llama Steady",
    role: "Stable Checker",
    emoji: "🏛️",
    specialty: "Stable",
    color: "#0668E1",
  },
  "sao10k/l3-lunaris-8b": {
    name: "Lunaris",
    role: "Moonshot Detector",
    emoji: "🌙",
    specialty: "Yield",
    color: "#8E44AD",
  },

  // 🔴 Mistral & Qwen ───────────────────────────────────────────────────────────
  "mistralai/mistral-small-24b-instruct-2501": {
    name: "Mistral Mind",
    role: "Stable Seeker",
    emoji: "🌊",
    specialty: "Stable",
    color: "#E74C3C",
  },
  "mistralai/mistral-nemo": {
    name: "Nemo Diver",
    role: "Deep Pool Hunter",
    emoji: "🐠",
    specialty: "Deep",
    color: "#E74C3C",
  },
  "qwen/qwen-turbo": {
    name: "Turbo Qwen",
    role: "Fast Yield Scan",
    emoji: "🚀",
    specialty: "Speed",
    color: "#FF6B35",
  },
  "qwen/qwen-2.5-7b-instruct": {
    name: "Qwen Analyst",
    role: "Trend Spotter",
    emoji: "📊",
    specialty: "Yield",
    color: "#FF6B35",
  },

  // 🟠 Enterprise ───────────────────────────────────────────────────────────────
  "microsoft/phi-4": {
    name: "Phi Precision",
    role: "Accuracy Auditor",
    emoji: "🎯",
    specialty: "Risk",
    color: "#00BCF2",
  },
  "cohere/command-r7b-12-2024": {
    name: "Command R",
    role: "Yield Commander",
    emoji: "🎖️",
    specialty: "Yield",
    color: "#D4A017",
  },
  "amazon/nova-lite-v1": {
    name: "Nova Lite",
    role: "Cloud Risk Scanner",
    emoji: "☁️",
    specialty: "Risk",
    color: "#FF9900",
  },
  "amazon/nova-micro-v1": {
    name: "Nova Micro",
    role: "Micro Signal",
    emoji: "⚙️",
    specialty: "Speed",
    color: "#FF9900",
  },
  "rekaai/reka-flash-3": {
    name: "Reka Flash",
    role: "Flash Opportunity",
    emoji: "⚡",
    specialty: "Speed",
    color: "#E91E63",
  },
  "gryphe/mythomax-l2-13b": {
    name: "MythoMax",
    role: "Legacy Validator",
    emoji: "🏺",
    specialty: "Stable",
    color: "#795548",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Safe getter with fallback
export function getPersona(modelId: string): Persona {
  return MODEL_PERSONAS[modelId] ?? {
    name: modelId.split('/').pop()?.split(':')[0] ?? modelId,
    role: "AI Analyst",
    emoji: "🤖",
    specialty: "Yield",
    color: "#888888",
  };
}

// Group swarm votes by specialty for the UI summary bar
export function groupBySpecialty(votes: { modelId: string; verdict: string }[]) {
  const groups: Record<Specialty, string[]> = {
    Risk: [], Yield: [], Speed: [], Stable: [], Deep: [],
  };
  for (const v of votes) {
    const p = getPersona(v.modelId);
    groups[p.specialty].push(v.verdict);
  }
  return groups;
}

// Get consensus winner label
export function getConsensusLabel(votes: { verdict: string }[]): {
  label: string;
  color: string;
} {
  const counts = votes.reduce((acc, v) => {
    acc[v.verdict] = (acc[v.verdict] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const verdictColors: Record<string, string> = {
    RECOMMENDED: '#22c55e',
    CAUTION:     '#f59e0b',
    AVOID:       '#ef4444',
  };
  return {
    label: top?.[0] ?? 'UNKNOWN',
    color: verdictColors[top?.[0]] ?? '#888',
  };
}
