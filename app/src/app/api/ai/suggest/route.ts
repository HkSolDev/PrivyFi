import { NextRequest, NextResponse } from 'next/server';

const SUGGEST_MODEL = "google/gemini-2.0-flash-001";

export async function POST(req: NextRequest) {
  try {
    const { portfolio, strategies } = await req.json();

    if (!portfolio || !strategies) {
      return NextResponse.json({ error: 'Portfolio and strategies are required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are the PrivyFi AI Investment Strategist. 
    Analyze the user's wallet (portfolio) and the available yield strategies.
    Pick the SINGLE BEST strategy for this user based on their holdings.
    
    Rules:
    1. If they hold a lot of SOL, prefer SOL-based pools.
    2. If they have stablecoins, prefer stablecoin vaults.
    3. If they have AUDD, suggest the Aussie Alpha vault.
    
    Return ONLY a JSON object:
    {
      "strategyId": "the id of the strategy",
      "reason": "One concise sentence explaining why this is the best for them specifically."
    }`;

    const userPrompt = `User Portfolio: ${JSON.stringify(portfolio)}
    Available Strategies: ${JSON.stringify(strategies.slice(0, 15))}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: SUGGEST_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error("AI suggestion failed");

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error('AI Suggest Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
