import { NextResponse } from 'next/server';

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: Request) {
  try {
    const { target, context } = await req.json();

    const systemPrompt = `You are a DeFi analyst. Compare this prediction market opportunity against the provided yield strategies. 
Give a concise analysis: is the market risk worth it vs just taking the yield? Reply in 3 bullet points max.`;

    const userPrompt = `
Prediction Market:
Title: ${target.title}
Protocol: ${target.protocol}
Yes Price: ${target.outcomes.find((o: any) => o.name === 'Yes')?.price}
No Price: ${target.outcomes.find((o: any) => o.name === 'No')?.price}

Top Yield Strategies:
${context.map((y: any) => `- ${y.name} on ${y.protocol} (APY: ${y.apy}%)`).join('\n')}
`;

    const res = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    return NextResponse.json({
      ok: true,
      analysis: data.choices?.[0]?.message?.content ?? 'Analysis failed.',
    });
  } catch (error) {
    console.error('predict-analyze error:', error);
    return NextResponse.json({ ok: false, analysis: 'Failed to generate analysis due to an error.' }, { status: 500 });
  }
}
