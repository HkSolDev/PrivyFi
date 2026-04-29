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
      content: `You are a strict DeFi risk assessment which help the user to find the best yield and & wihtout any baise analyze the portfolio tell in a fun and simple way user understand. Your job is to analyze the given yield strategy and the user's portfolio context, then decide if it's a recommended investment also give the user example if you invest this much you got this much in these muhc days .
      
      You MUST respond with a valid JSON object matching this exact structure:
      {
        "recommended": boolean,
        "confidenceScore": number (0-100),
        "riskLevel": "Low" | "Medium" | "High",
        "reasoning": "A short, one-sentence explanation"
      }
      
      Do not include any other text, markdown formatting (like \`\`\`json), or conversational filler. Only output the raw JSON object.`
    };

    const userPrompt = {
      role: 'user',
      content: `Analyze this strategy: ${JSON.stringify(strategy)}. User portfolio context: ${portfolio ? JSON.stringify(portfolio) : 'Unknown'}.`
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.5-flash-02-23',
        messages: [systemPrompt, userPrompt],
        temperature: 0.2,
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
      // Sometimes models wrap in markdown even when told not to
      const cleanContent = content.replace(/^```json\\n?/, '').replace(/\\n?```$/, '').trim();
      const parsedJson = JSON.parse(cleanContent);
      return NextResponse.json(parsedJson);
    } catch (parseError) {
      console.error('Failed to parse JSON from AI:', content);
      // Fallback
      return NextResponse.json({
        recommended: strategy.risk !== 'High',
        confidenceScore: 75,
        riskLevel: strategy.risk || 'Medium',
        reasoning: 'Fallback analysis: Proceed with standard caution.'
      });
    }

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
