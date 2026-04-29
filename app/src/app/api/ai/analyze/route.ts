import { NextRequest, NextResponse } from 'next/server';

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
      content: `You are a fun, sharp DeFi risk analyst. Analyze the given yield strategy against the user's portfolio and give a clear, actionable verdict.

      You MUST respond with a valid JSON object matching this EXACT structure — no extra text, no markdown fences:
      {
        "recommended": boolean,
        "confidenceScore": number (0-100, your certainty in this recommendation),
        "riskScore": number (0-100, where 0 = zero risk, 100 = extremely dangerous),
        "riskLevel": "Low" | "Medium" | "High",
        "reasoning": string[] (exactly 3 bullet-point reasons, each 1 concise sentence, keep it human and fun),
        "exampleReturn": string (e.g. "If you deposit $100 today, you could earn ~$X in 30 days at current APY")
      }

      Rules:
      - reasoning array MUST have exactly 3 strings
      - Be honest — high APY pools should have higher riskScore
      - exampleReturn should use the strategy's APY to calculate a realistic 30-day example
      - Keep tone friendly, not robotic`
    };

    const userPrompt = {
      role: 'user',
      content: `Analyze this DeFi strategy: ${JSON.stringify(strategy)}. User portfolio context: ${portfolio ? JSON.stringify(portfolio) : 'Not provided — assume general DeFi user'}.`
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: [systemPrompt, userPrompt],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch from OpenRouter' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      // Strip markdown code fences if model ignores instructions
      const cleanContent = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsedJson = JSON.parse(cleanContent);

      // Normalize: ensure reasoning is always an array
      if (typeof parsedJson.reasoning === 'string') {
        parsedJson.reasoning = [parsedJson.reasoning];
      }
      if (!Array.isArray(parsedJson.reasoning)) {
        parsedJson.reasoning = ['Analysis complete. Review strategy details carefully.'];
      }

      return NextResponse.json(parsedJson);
    } catch (parseError) {
      console.error('Failed to parse JSON from AI:', content);
      // Structured fallback
      return NextResponse.json({
        recommended: strategy.risk !== 'High',
        confidenceScore: 70,
        riskScore: strategy.risk === 'High' ? 75 : strategy.risk === 'Medium' ? 45 : 20,
        riskLevel: strategy.risk || 'Medium',
        reasoning: [
          'Could not parse full AI response — using rule-based fallback.',
          `This pool has a ${strategy.risk || 'Medium'} risk profile based on its structure.`,
          'Always do your own research before depositing funds.'
        ],
        exampleReturn: 'Example returns unavailable — check the APY manually.'
      });
    }

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
