import { NextRequest, NextResponse } from 'next/server';

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

const RESEARCH_MODELS = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'google/gemini-2.0-flash-lite-001', name: 'Gemini Flash Lite' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' },
];

const SWARM_MODELS = [
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 Pro', specialty: 'Risk' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Alpha Hunter', specialty: 'Yield' },
  { id: 'mistralai/mistral-nemo', name: 'Nemo Diver', specialty: 'Speed' },
  { id: 'qwen/qwen-turbo', name: 'Turbo Qwen', specialty: 'Stable' },
  { id: 'microsoft/phi-4', name: 'Phi Precision', specialty: 'Deep' },
  { id: 'amazon/nova-lite-v1', name: 'Nova Lite', specialty: 'Risk' },
  { id: 'google/gemini-2.0-flash-lite-001', name: 'Lite Watcher', specialty: 'Yield' },
];

interface Vote {
  model: string;
  personaName: string;
  specialty: string;
  vote: 'Recommended' | 'Caution' | 'SKIP';
  confidenceScore: number;
  riskScore: number;
  reasoning: string;
}

// ─── Step 1: Research ────────────────────────────────────────────────────────
async function tryResearchWithModel(modelId: string, strategy: any): Promise<string | null> {
  try {
    const res = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        plugins: [{ id: 'web', max_results: 5 }],
        messages: [{
          role: 'user',
          content: `Search the internet for recent news, smart contract audits, and sentiment about the DeFi protocol: "${strategy.protocol}" and specifically the pool/vault: "${strategy.name}".

Find and summarize:
1. Any recent hacks, exploits, or warnings?
2. Current yield sustainability
3. General public sentiment
Give data for a risk/yield analysis. Cite sources briefly.`,
        }],
      }),
    });

    if (!res.ok) {
      console.error(`Research Model ${modelId} failed with status:`, res.status);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const isUseful = content.length > 100
      && !content.toLowerCase().includes("i don't have access")
      && !content.toLowerCase().includes("i cannot browse")
      && !content.toLowerCase().includes("i'm unable to search");

    return isUseful ? content : null;

  } catch {
    return null;
  }
}

async function researchStrategyWithFallback(strategy: any): Promise<string> {
  for (const model of RESEARCH_MODELS) {
    const result = await tryResearchWithModel(model.id, strategy);
    if (result) return result;
  }
  return `No live internet data available for "${strategy.protocol} ${strategy.name}". AI models will analyze based on APY, TVL, and general knowledge only.`;
}

// ─── Step 2: Swarm Votes ─────────────────────────────────────────────────────
async function getIndependentVote(
  model: { id: string; name: string; specialty: string },
  strategy: any,
  research: string
): Promise<Vote> {
  const systemPrompts: Record<string, string> = {
    Risk:   'You are a RISK-FOCUSED DeFi analyst. You always look for smart contract vulnerabilities and impermanent loss. Be skeptical.',
    Yield:  'You are an OPPORTUNITY-FOCUSED DeFi analyst. You look for high sustainable APYs and token incentives.',
    Speed:  'You are a MOMENTUM analyst. You focus on TVL growth and recent protocol adoption trends.',
    Stable: 'You are a CONSERVATIVE analyst. You only recommend pools with high TVL and proven track records.',
    Deep:   'You are a CONTRARIAN analyst. You look for hidden alpha or risks that the crowd ignores.',
  };

  try {
    const res = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: 'system',
            content: systemPrompts[model.specialty] ?? 'You are a DeFi analyst.',
          },
          {
            role: 'user',
            content: `DEFI STRATEGY:
Protocol: ${strategy.protocol}
Pool Name: ${strategy.name}
Type: ${strategy.type}
Tokens: ${strategy.tokens.join(', ')}
APY: ${strategy.apy}
TVL: ${strategy.tvl}

REAL INTERNET RESEARCH:
${research}

Based on your analytical lens, the raw metrics, and the research above:
Should someone invest in this pool? Is it safe and profitable?

Reply JSON only:
{
  "vote": "Recommended" or "Caution",
  "confidenceScore": <number between 0 and 100>,
  "riskScore": <number between 0 and 100>,
  "reasoning": "<one sentence explaining YOUR specific reasoning>"
}`
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`Swarm Model ${model.id} failed with status:`, res.status);
      return { model: model.id, personaName: model.name, specialty: model.specialty, vote: 'SKIP', confidenceScore: 0, riskScore: 0, reasoning: 'API failure' };
    }
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      model: model.id,
      personaName: model.name,
      specialty: model.specialty,
      vote: parsed.vote === 'Recommended' || parsed.vote === 'Caution' ? parsed.vote : 'SKIP',
      confidenceScore: parsed.confidenceScore || 50,
      riskScore: parsed.riskScore || 50,
      reasoning: parsed.reasoning || 'Analysis complete.',
    };
  } catch {
    return { model: model.id, personaName: model.name, specialty: model.specialty, vote: 'SKIP', confidenceScore: 0, riskScore: 0, reasoning: 'Parse failed' };
  }
}

// ─── Step 3: Summary ─────────────────────────────────────────────────────────
async function summarizeReasons(strategy: any, research: string, votes: Vote[]): Promise<string[]> {
  try {
    const res = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: `You are the chief DeFi risk officer.
Strategy: ${strategy.protocol} ${strategy.name} (${strategy.apy} APY, ${strategy.tvl} TVL)

Research provided:
${research}

The swarm voted as follows:
${votes.map(v => `- ${v.personaName} (${v.specialty}): ${v.vote} (Risk: ${v.riskScore}/100) - ${v.reasoning}`).join('\n')}

Distill the swarm's analysis into exactly 3 bullet point strings that explain the key risks and rewards of this pool.

Reply JSON only:
{
  "reasons": ["Point 1", "Point 2", "Point 3"]
}`
          }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Summary Generation failed with status:', res.status);
      return ["Consensus reached but summary failed."];
    }
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.reasons || ["Consensus reached."];
  } catch {
    return ["Summary generation failed due to network error."];
  }
}

// ─── Route Handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { strategy } = body;

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    // Step 1: Research
    const research = await researchStrategyWithFallback(strategy);

    // Step 2: Swarm Votes
    const votePromises = SWARM_MODELS.map(model => getIndependentVote(model, strategy, research));
    const allVotes = await Promise.all(votePromises);
    const validVotes = allVotes.filter(v => v.vote !== 'SKIP');

    if (validVotes.length === 0) {
      throw new Error("Swarm failed to respond.");
    }

    const recommendedVotes = validVotes.filter(v => v.vote === 'Recommended');
    const isRecommended = recommendedVotes.length >= (validVotes.length / 2);
    
    const avgConf = validVotes.reduce((acc, v) => acc + v.confidenceScore, 0) / validVotes.length;
    const avgRisk = validVotes.reduce((acc, v) => acc + v.riskScore, 0) / validVotes.length;

    // Step 3: Summarize reasons
    const reasoning = await summarizeReasons(strategy, research, validVotes);

    const numericApy = typeof strategy.apy === 'string' 
      ? parseFloat(strategy.apy.replace('%', ''))
      : strategy.apy;

    return NextResponse.json({
      recommended: isRecommended,
      confidenceScore: Math.round(avgConf),
      riskScore: Math.round(avgRisk),
      riskLevel: avgRisk < 35 ? "Low" : avgRisk < 65 ? "Medium" : "High",
      reasoning,
      exampleReturn: `If you deposit $100 today, you could earn ~$${(100 * numericApy/100 / 12).toFixed(2)} in 30 days at current APY`,
      swarmVotes: validVotes.map(v => ({
        model: v.model,
        vote: v.vote,
        confidence: v.confidenceScore,
        reasoning: v.reasoning
      }))
    });

  } catch (error: any) {
    console.error('Yield Analysis API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
