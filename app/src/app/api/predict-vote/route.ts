import { NextResponse } from 'next/server';

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
  modelId: string;
  personaName: string;
  specialty: string;
  vote: 'YES' | 'NO' | 'SKIP';
  confidence: number;
  reason: string;
}

// ─── Step 1: Research ────────────────────────────────────────────────────────
async function tryResearchWithModel(modelId: string, question: string): Promise<string | null> {
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
          content: `Search the internet for recent news and discussions about:
"${question}"

Find and summarize:
1. Latest news articles
2. Expert/analyst opinions  
3. Current public sentiment
4. Recent events affecting this outcome

Give data for the analysis for the prediction market. Cite sources briefly.`,
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

async function researchMarketWithFallback(question: string): Promise<string> {
  for (const model of RESEARCH_MODELS) {
    const result = await tryResearchWithModel(model.id, question);
    if (result) return result;
  }
  return `No live internet data available for "${question}". AI models will analyze based on market prices and general knowledge only.`;
}

// ─── Step 2: Swarm Votes ─────────────────────────────────────────────────────
async function getIndependentVote(
  model: { id: string; name: string; specialty: string },
  question: string,
  research: string,
  yesPrice: number,
  noPrice: number,
): Promise<Vote> {
  const systemPrompts: Record<string, string> = {
    Risk:   'You are a RISK-FOCUSED analyst. You always look for what could go wrong. Be skeptical.',
    Yield:  'You are an OPPORTUNITY-FOCUSED analyst. You look for upside and positive signals.',
    Speed:  'You are a MOMENTUM analyst. You focus on recent trends and velocity of change.',
    Stable: 'You are a CONSERVATIVE analyst. You only bet when evidence is overwhelming.',
    Deep:   'You are a CONTRARIAN analyst. You look for what the crowd is missing.',
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
            content: systemPrompts[model.specialty] ?? 'You are a prediction market analyst.',
          },
          {
            role: 'user',
            content: `PREDICTION MARKET QUESTION:
"${question}"

CURRENT MARKET PRICES:
YES = ${(yesPrice * 100).toFixed(0)}¢  (market thinks ${(yesPrice * 100).toFixed(0)}% chance)
NO  = ${(noPrice  * 100).toFixed(0)}¢  (market thinks ${(noPrice  * 100).toFixed(0)}% chance)

REAL INTERNET RESEARCH:
${research}

Based on your analytical lens and the research above:
Should someone bet YES or NO?

Reply JSON only:
{
  "vote": "YES" or "NO",
  "confidence": <number between 0 and 100>,
  "reason": "<one sentence explaining YOUR specific reasoning>"
}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`Swarm Model ${model.id} failed with status:`, res.status, data);
      return { modelId: model.id, personaName: model.name, specialty: model.specialty, vote: 'SKIP', confidence: 0, reason: 'API failure' };
    }
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      modelId: model.id,
      personaName: model.name,
      specialty: model.specialty,
      vote: parsed.vote === 'YES' || parsed.vote === 'NO' ? parsed.vote : 'SKIP',
      confidence: parsed.confidence || 0,
      reason: parsed.reason || 'Analysis complete.',
    };
  } catch {
    return { modelId: model.id, personaName: model.name, specialty: model.specialty, vote: 'SKIP', confidence: 0, reason: 'Parse failed' };
  }
}

// ─── Step 3: Summary ─────────────────────────────────────────────────────────
async function summarizeVotes(question: string, research: string, votes: Vote[]): Promise<string> {
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
            content: `You are the chief analyst.
Question: "${question}"

Research provided:
${research}

The swarm voted as follows:
${votes.map(v => `- ${v.personaName} (${v.specialty}): ${v.vote} (Conf: ${v.confidence}%) - ${v.reason}`).join('\n')}

Write a simple, easy-to-read paragraph summarizing why the consensus landed where it did, and if there are any major risks to watch out for. Keep it under 4 sentences.`
          }
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Summary Generation failed with status:', res.status, data);
      return 'Summary generation failed due to API error.';
    }
    return data.choices?.[0]?.message?.content ?? 'The swarm reached consensus based on available data and current market prices.';
  } catch {
    return 'Summary generation failed due to network error.';
  }
}

// ─── Route Handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, yesPrice, noPrice, protocolUrl } = body;

    // Step 1
    const research = await researchMarketWithFallback(question);

    // Step 2
    const votePromises = SWARM_MODELS.map(model => getIndependentVote(model, question, research, yesPrice, noPrice));
    const allVotes = await Promise.all(votePromises);
    const validVotes = allVotes.filter(v => v.vote !== 'SKIP');

    const yesVotes = validVotes.filter(v => v.vote === 'YES');
    const noVotes = validVotes.filter(v => v.vote === 'NO');

    const consensus = yesVotes.length >= noVotes.length ? 'YES' : 'NO';
    const avgConf = validVotes.length > 0 ? validVotes.reduce((acc, v) => acc + v.confidence, 0) / validVotes.length : 0;

    // Step 3
    const summary = await summarizeVotes(question, research, validVotes);

    return NextResponse.json({
      ok: true,
      consensus,
      confidence: Math.round(avgConf),
      yesCount: yesVotes.length,
      noCount: noVotes.length,
      research,
      votes: validVotes,
      summary,
      betUrl: protocolUrl,
      disclaimer: '⚠️ AI suggestion only. Not financial advice.'
    });
  } catch (error: any) {
    console.error('Vote API Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
