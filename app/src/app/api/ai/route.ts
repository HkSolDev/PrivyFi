import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, portfolio, staked, strategies } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    // Construct the System Prompt with Portfolio Context
    const portfolioContext = portfolio 
      ? `The user's current Solana portfolio (unstaked tokens): ${JSON.stringify(portfolio)}. `
      : "The user's portfolio is currently unknown or not connected. ";

    const stakedContext = staked && staked.length > 0
      ? `The user currently has these assets actively staked/deposited in the PrivyFi Smart Contract: ${JSON.stringify(staked)}. Always acknowledge these staked positions if the user asks about their deposits or account info!`
      : "The user currently has NO assets deposited in the PrivyFi smart contract.";

    const yieldContext = strategies && strategies.length > 0
      ? `Current live yield opportunities on Solana: ${JSON.stringify(strategies.slice(0, 10))}. `
      : "No live yield data available. Reccomend top tier protocols like Kamino and Meteora based on general knowledge. ";

    const systemPrompt = {
      role: 'system',
      content: `You are the PrivyFi AI Advisor, a world-class Solana DeFi expert. 
      Your goal is to provide yield optimization strategies and risk assessments.
      STRICT RULES:
      1. Be ultra-concise. Never use long paragraphs.
      2. Use short bullet points for everything.
      3. Focus on actionable data (APY, TVL, Strategy).
      4. Maintain a premium, professional tone.
      ${portfolioContext}
      ${stakedContext}
      ${yieldContext}
      When recommending strategies, prioritize the live data provided above.
      Always remind the user to verify transactions.`
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
        model: 'qwen/qwen3.5-flash-02-23',
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
