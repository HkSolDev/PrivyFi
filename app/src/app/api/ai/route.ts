import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, portfolio } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    // Construct the System Prompt with Portfolio Context
    const portfolioContext = portfolio 
      ? `The user's current Solana portfolio: ${JSON.stringify(portfolio)}. `
      : "The user's portfolio is currently unknown or not connected. ";

    const systemPrompt = {
      role: 'system',
      content: `You are the PrivyFi AI Advisor, a world-class Solana DeFi expert. 
      Your goal is to provide yield optimization strategies, risk assessments, and portfolio insights.
      Be concise, professional, and sophisticated. Use a tone that matches a premium DeFi protocol.
      ${portfolioContext}
      When recommending strategies, prioritize Kamino, Jupiter, and Orca.
      Always remind the user to verify transactions before signing.`
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://privyfi.com', // Optional
        'X-Title': 'PrivyFi', // Optional
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [systemPrompt, ...messages],
        temperature: 0.7,
        max_tokens: 500,
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
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
