import { NextRequest, NextResponse } from 'next/server';

// ─── Single model for fast card analysis ──────────────────────────────────
const ANALYZE_MODEL = 'google/gemini-2.5-flash-lite';

// ─── Research models with fallback (Web-enabled) ───────────────────────────
const RESEARCH_MODELS = [
  { id: 'perplexity/sonar',                name: 'Perplexity' },
  { id: 'google/gemini-2.0-flash-001',     name: 'Gemini Flash' },
];

// ─── Small swarm for deep research only ───────────────────────────────────
const SWARM_MODELS = [
  { id: 'google/gemini-2.5-flash-lite',       name: 'Flash Lite'  },
  { id: 'qwen/qwen3.5-9b',                    name: 'Qwen'        },
  { id: 'mistralai/ministral-3b',             name: 'Ministral'   },
  { id: 'meta-llama/llama-3.3-70b-instruct',  name: 'Llama 70B'   },
];

const YIELD_SYSTEM_PROMPT = `You are a DeFi analyst. Analyze this yield strategy.
Return ONLY valid JSON:
{
  "recommended": boolean,
  "confidenceScore": number (0-100),
  "riskScore": number (0-100),
  "riskLevel": "Low" | "Medium" | "High",
  "reasoning": string (one concise sentence),
  "verdict": "Market Edge" | "Take the Yield" | "High Risk"
}`;

const PREDICTION_SYSTEM_PROMPT = `You are a DeFi analyst. Be concise. 
Reply with exactly 3 bullet points. Max 20 words per bullet.
End with a single line "Verdict: [Market Edge / Take the Yield / High Risk]"`;

// ─── Research Helper ───────────────────────────────────────────────────────
// Returns structured JSON: { summary, bullets: [{text, source, leanNo}], signals: string[] }
async function performResearch(topic: string, yesPrice: number, apiKey: string): Promise<any | null> {
  const yesPct = (yesPrice * 100).toFixed(1);
  const RESEARCH_SYSTEM = `You are a real-time prediction market analyst with live web access.
For the market question provided, return ONLY valid JSON:
{
  "summary": "One sentence: Market prices YES at ${yesPct}% — here's why the data leans [YES/NO]",
  "bullets": [
    { "text": "Key fact here", "source": "Source Name", "sourceUrl": "https://...", "leansNo": true },
    { "text": "Key fact here", "source": "Source Name", "sourceUrl": "https://...", "leansNo": false }
  ],
  "signals": ["Signal Tag 1", "Signal Tag 2", "Signal Tag 3"]
}
Provide 3-4 bullets. Each bullet must have a real source name and plausible URL. signals are 2-3 word tags like "Regime stable", "Low defections", "CIA agrees".`;

  for (const model of RESEARCH_MODELS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.id,
          max_tokens: 600,
          temperature: 0.3,
          messages: [
            { role: 'system', content: RESEARCH_SYSTEM },
            { role: 'user',   content: `Market question: "${topic}"` }
          ],
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || '';
        const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        try {
          return JSON.parse(clean);
        } catch {
          // Return raw text as fallback summary
          return { summary: raw.slice(0, 200), bullets: [], signals: [] };
        }
      }
    } catch (e) {
      console.warn(`Research fallback: ${model.name} failed`);
    }
  }
  return null;
}

// ─── Single model call helper ──────────────────────────────────────────────
async function callModel(
  modelId: string,
  systemPrompt: string,
  userContent: any,
  apiKey: string,
  maxTokens: number = 200,
  researchContext: string | null = null
): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const injectedMessage = researchContext
      ? `REAL-TIME RESEARCH: ${researchContext}\n\nTARGET: ${typeof userContent === 'string' ? userContent : JSON.stringify(userContent)}`
      : (typeof userContent === 'string' ? userContent : JSON.stringify(userContent));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: injectedMessage }
        ],
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? '';

    return raw;
  } catch {
    return null;
  }
}

// ─── Route Handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { strategy, target, context, mode = 'single', isDeepResearch } = body;
    // mode: 'single' = fast card analyze
    //       'swarm'  = deep research (user explicitly requests)

    const isPrediction = !!target;
    
    if (!strategy && !isPrediction) {
      return NextResponse.json(
        { error: 'Strategy or Target is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // --- PREDICTION ANALYSIS (from PredictView.tsx) ---
    if (isPrediction) {
      if (mode === 'swarm' || isDeepResearch) {
        // Step 1: Research (web-enabled fallback chain)
        const yesPrice = target.outcomes?.find((o: any) => o.name === 'Yes')?.price ?? 0.5;
        const researchData = await performResearch(target.title, yesPrice, apiKey);
        const researchContext = researchData 
          ? `${researchData.summary}\n${(researchData.bullets || []).map((b: any) => `- ${b.text} [${b.source}]`).join('\n')}`
          : null;
        
        // Step 2: Jury Swarm with Context
        const PREDICT_SWARM_PROMPT = `You are a prediction market analyst. Use the provided research context if available.
Return ONLY valid JSON:
{
  "vote": "YES" | "NO",
  "confidenceScore": number (0-100),
  "reasoning": string (one concise sentence)
}`;
        
        const results = await Promise.allSettled(
          SWARM_MODELS.map(m => callModel(m.id, PREDICT_SWARM_PROMPT, target, apiKey, 250, researchContext))
        );

        const validVotes = results
          .map((r, i) => {
            if (r.status !== 'fulfilled' || !r.value) return null;
            const clean = r.value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
            try {
              const v = JSON.parse(clean);
              return {
                model:           SWARM_MODELS[i].name,
                vote:            v.vote === 'YES' ? 'YES' : 'NO',
                confidence:      v.confidenceScore ?? 50,
                reasoning:       v.reasoning       ?? '',
              };
            } catch (e) { return null; }
          })
          .filter(Boolean) as any[];

        if (validVotes.length === 0) {
          return NextResponse.json({ error: 'Swarm failed' }, { status: 503 });
        }

        const yesCount = validVotes.filter(v => v.vote === 'YES').length;
        const noCount = validVotes.filter(v => v.vote === 'NO').length;
        const consensusVote = yesCount >= noCount ? 'YES' : 'NO';
        const consensusText = `${Math.max(yesCount, noCount)}/${validVotes.length} models say ${consensusVote}`;
        const avgConfidence = Math.round(validVotes.reduce((a, v) => a + v.confidence, 0) / validVotes.length);
        const uniqueReasons = [...new Set(validVotes.map(v => v.reasoning).filter(Boolean))].slice(0, 3);

        return NextResponse.json({
          ok: true,
          consensus: consensusText,
          consensusVote,
          confidence: avgConfidence,
          research: researchData ?? null,
          why: uniqueReasons.length > 0 ? uniqueReasons : ['Models reached consensus based on historical trends.', 'Market pricing aligns with projected probabilities.', 'Current events heavily favor this outcome.'],
          riskWarning: 'Prediction markets are highly volatile and illiquid. Trade with caution.',
          votes: validVotes
        });
      } else {
        const userPrompt = `Compare this prediction market: ${JSON.stringify(target)} against these yield opportunities: ${JSON.stringify(context)}`;
        const raw = await callModel(ANALYZE_MODEL, PREDICTION_SYSTEM_PROMPT, userPrompt, apiKey, 300);
        
        if (!raw) {
          return NextResponse.json({ error: 'Analysis failed' }, { status: 503 });
        }
        return NextResponse.json({ ok: true, analysis: raw });
      }
    }

    // --- YIELD ANALYSIS (from useAIRecommendation.ts) ---
    const activeMode = isDeepResearch ? 'swarm' : mode;

    if (activeMode === 'single') {
      const raw = await callModel(ANALYZE_MODEL, YIELD_SYSTEM_PROMPT, strategy, apiKey);
      if (!raw) return NextResponse.json({ error: 'Analysis failed' }, { status: 503 });

      // Strip markdown code fences if present
      const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      let result;
      try { result = JSON.parse(clean); } catch (e) { return NextResponse.json({ error: 'Invalid JSON' }, { status: 500 }); }

      return NextResponse.json({
        recommended:     result.recommended,
        confidenceScore: result.confidenceScore ?? 50,
        riskScore:       result.riskScore ?? 50,
        riskLevel:       result.riskLevel ?? 'Medium',
        reasoning:       [result.reasoning],
        verdict:         result.verdict ?? 'High Risk',
        exampleReturn:   `$100 deposit → ~$${(100 * parseFloat(strategy.apy) / 100 / 12).toFixed(2)} in 30 days`,
        model:           ANALYZE_MODEL,
        swarmVotes:      [],
      });
    }

    // ── SWARM MODE — deep research, 4 models parallel ─────────────────────
    const results = await Promise.allSettled(
      SWARM_MODELS.map(m => callModel(m.id, YIELD_SYSTEM_PROMPT, strategy, apiKey))
    );

    const validVotes = results
      .map((r, i) => {
        if (r.status !== 'fulfilled' || !r.value) return null;
        const clean = r.value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        try {
          const v = JSON.parse(clean);
          return {
            model:           SWARM_MODELS[i].name,
            vote:            v.recommended ? 'Recommended' : 'Caution',
            riskScore:       v.riskScore       ?? 50,
            confidenceScore: v.confidenceScore ?? 50,
            reasoning:       v.reasoning       ?? '',
            verdict:         v.verdict         ?? 'High Risk',
          };
        } catch (e) { return null; }
      })
      .filter(Boolean) as any[];

    if (validVotes.length === 0) {
      return NextResponse.json(
        { error: 'Swarm failed — all models timed out' },
        { status: 503 }
      );
    }

    const recommendedCount = validVotes.filter(v => v.vote === 'Recommended').length;
    const avgRisk       = Math.round(validVotes.reduce((a, v) => a + v.riskScore, 0)       / validVotes.length);
    const avgConfidence = Math.round(validVotes.reduce((a, v) => a + v.confidenceScore, 0) / validVotes.length);
    const uniqueReasons = [...new Set(validVotes.map(v => v.reasoning).filter(Boolean))].slice(0, 3);

    const verdicts = validVotes.map(v => v.verdict);
    const verdict  = verdicts.sort((a, b) => verdicts.filter(v => v === b).length - verdicts.filter(v => v === a).length)[0];

    return NextResponse.json({
      recommended:     recommendedCount > validVotes.length / 2,
      confidenceScore: avgConfidence,
      riskScore:       avgRisk,
      riskLevel:       avgRisk < 35 ? 'Low' : avgRisk < 65 ? 'Medium' : 'High',
      reasoning:       uniqueReasons.length > 0 ? uniqueReasons : ['Swarm reached consensus.'],
      verdict,
      exampleReturn:   `$100 deposit → ~$${(100 * parseFloat(strategy.apy) / 100 / 12).toFixed(2)} in 30 days`,
      swarmVotes:      validVotes,
      modelsResponded: validVotes.length,
      modelsTried:     SWARM_MODELS.length,
    });

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
