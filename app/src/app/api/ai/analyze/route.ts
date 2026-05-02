import { NextRequest, NextResponse } from 'next/server';

const SWARM_MODELS = [
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

  // 🟣 Meta Llama Family
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.2-1b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
  "sao10k/l3-lunaris-8b",

  // 🔴 Mistral & Qwen
  "mistralai/mistral-small-24b-instruct-2501",
  "mistralai/mistral-nemo",
  "qwen/qwen-turbo",
  "qwen/qwen-2.5-7b-instruct",

  // 🟠 Specialized & Enterprise
  "microsoft/phi-4",
  "cohere/command-r7b-12-2024",
  "amazon/nova-lite-v1",
  "amazon/nova-micro-v1",
  "rekaai/reka-flash-3",
  "gryphe/mythomax-l2-13b"
];

export async function POST(req: NextRequest) {
  try {
    const { strategy, portfolio } = await req.json();

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const systemPrompt = {
      role: 'system',
      content: `You are an AI node in a Swarm Consensus network. Analyze this yield strategy.
      Return ONLY a JSON object:
      {
        "recommended": boolean,
        "confidenceScore": number (0-100),
        "riskScore": number (0-100),
        "riskLevel": "Low" | "Medium" | "High",
        "reasoning": string[] (exactly 1 concise reason)
      }`
    };

    const userPrompt = {
      role: 'user',
      content: `Analyze this DeFi strategy: ${JSON.stringify(strategy)}.`
    };

    const fetchPromises = SWARM_MODELS.map(async (modelId) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [systemPrompt, userPrompt],
            temperature: 0.3,
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!response.ok) return null;
        const data = await response.json();
        const content = data.choices[0].message.content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(content);
        
        return {
          model: modelId.split('/')[1].split(':')[0],
          vote: parsed.recommended ? 'Recommended' : 'Caution',
          riskScore: parsed.riskScore || 50,
          reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning[0] : parsed.reasoning,
          confidenceScore: parsed.confidenceScore || 50
        };
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    const validVotes = results.filter((r): r is any => r !== null);

    if (validVotes.length === 0) {
      throw new Error("Swarm failed to respond.");
    }

    // Aggregate results
    const recommendedCount = validVotes.filter(v => v.vote === 'Recommended').length;
    const isRecommended = recommendedCount > validVotes.length / 2;
    const avgRisk = Math.round(validVotes.reduce((acc, v) => acc + v.riskScore, 0) / validVotes.length);
    const avgConfidence = Math.round(validVotes.reduce((acc, v) => acc + v.confidenceScore, 0) / validVotes.length);
    
    // Combine reasoning
    const allReasons = validVotes.map(v => v.reasoning).filter(Boolean);
    const uniqueReasons = Array.from(new Set(allReasons)).slice(0, 3); // Take top 3 unique

    return NextResponse.json({
      recommended: isRecommended,
      confidenceScore: avgConfidence,
      riskScore: avgRisk,
      riskLevel: avgRisk < 35 ? "Low" : avgRisk < 65 ? "Medium" : "High",
      reasoning: uniqueReasons.length > 0 ? uniqueReasons : ["The Swarm reached consensus."],
      exampleReturn: `If you deposit $100 today, you could earn ~$${(100 * parseFloat(strategy.apy)/100 / 12).toFixed(2)} in 30 days at current APY`,
      swarmVotes: validVotes
    });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
