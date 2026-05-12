import { NextRequest, NextResponse } from 'next/server';

const CHAT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

export async function POST(req: NextRequest) {
  try {
    const { message, portfolio, strategies } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const portfolioContext = portfolio?.length
      ? `User holds: ${portfolio.map((t: any) => `${t.balance} ${t.symbol}`).join(', ')}.`
      : 'User portfolio unknown.';
    const yieldContext = strategies?.length
      ? `Available yields: ${strategies.slice(0, 8).map((s: any) => `${s.name} ${s.apy}% APY`).join(', ')}.`
      : 'No yield data.';

    const systemPrompt = `You are PrivyFi's Flash Analyst — an AI DeFi yield advisor on Solana.
You have access to the user's portfolio and live yield data.
Answer concisely (1-3 sentences). Be specific with pool names and APY numbers when available.
${portfolioContext}
${yieldContext}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', response.status, errText);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response.';

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
