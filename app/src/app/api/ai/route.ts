import { NextRequest, NextResponse } from 'next/server';

const VOTERS = [
  // 🔥 Heavy Hitters
  { id: "openai/gpt-oss-120b:free", category: "Strong" },
  { id: "openai/gpt-oss-20b:free", category: "Strong" },
  { id: "z-ai/glm-4.5-air:free", category: "Strong" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", category: "Strong" },
  { id: "nvidia/nemotron-nano-12b-v2-vl:free", category: "Strong" },
  { id: "nvidia/nemotron-nano-9b-v2:free", category: "Strong" },

  // 🧠 Reasoning / Thinking
  { id: "liquid/lfm-2.5-1.2b-thinking:free", category: "Strong" },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", category: "Strong" },

  // 🤖 Qwen Family
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", category: "Coding" },
  { id: "qwen/qwen3-coder:free", category: "Coding" },

  // 🟢 Meta Llama
  { id: "meta-llama/llama-3.3-70b-instruct:free", category: "Fast" },
  { id: "meta-llama/llama-3.2-3b-instruct:free", category: "Fast" },

  // 🔵 Google Gemma
  { id: "google/gemma-3-27b-it:free", category: "Fast" },
  { id: "google/gemma-3-12b-it:free", category: "Fast" },
  { id: "google/gemma-3-4b-it:free", category: "Fast" },
  { id: "google/gemma-3n-e4b-it:free", category: "Fast" },
  { id: "google/gemma-3n-e2b-it:free", category: "Fast" },

  // 🐬 Uncensored
  { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", category: "Strong" },

  // 🦙 Nous Research
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", category: "Strong" },

  // ⚡ Sourceful Riverflow
  { id: "sourceful/riverflow-v2-fast-preview", category: "Fast" },
  { id: "sourceful/riverflow-v2-standard-preview", category: "Fast" },
  { id: "sourceful/riverflow-v2-max-preview", category: "Fast" },
  
  // Wildcard
  { id: "openrouter/free", category: "Fast" }
];

const TIEBREAKER = "nousresearch/hermes-3-llama-3.1-405b:free";

export async function POST(req: NextRequest) {
  try {
    const { portfolio, strategies } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const portfolioContext = portfolio 
      ? `User Portfolio: ${JSON.stringify(portfolio)}.`
      : "User Portfolio: Unknown.";

    const yieldContext = strategies && strategies.length > 0
      ? `Live Solana Yield Opportunities: ${JSON.stringify(strategies.slice(0, 10))}.`
      : "No live yield data.";

    const systemPrompt = {
      role: 'system',
      content: `You are an independent AI node in the PrivyFi Yield Consensus Swarm.
      Analyze the data and choose the SINGLE BEST yield opportunity.
      ${portfolioContext}
      ${yieldContext}
      
      Respond ONLY with raw JSON:
      {
        "vote": "Exact Pool Name",
        "confidence": 1-100,
        "reason": "One short summary"
      }`
    };

    // Parallel fetch with individual timeouts to prevent hang
    const fetchPromises = VOTERS.map(async (voter) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per model

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: voter.id,
            messages: [systemPrompt],
            temperature: 0.1,
            max_tokens: 150,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok) return null;
        
        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();
        if (!content) return null;

        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanContent);
        
        return { 
          model: voter.id.split('/')[1].split(':')[0], // Cleaner name
          category: voter.category,
          ...parsed 
        };
      } catch (e) {
        return null; // Gracefully handle failure
      }
    });

    const results = await Promise.all(fetchPromises);
    const validVotes = results.filter(r => r !== null && r.vote);

    const voteCounts: Record<string, number> = {};
    validVotes.forEach(v => {
      voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
    });

    // Find the maximum number of votes
    let maxVotes = 0;
    for (const count of Object.values(voteCounts)) {
      if (count > maxVotes) maxVotes = count;
    }

    // Find all pools that have the max votes (potential ties)
    const tiedPools = Object.keys(voteCounts).filter(pool => voteCounts[pool] === maxVotes);

    let winner = tiedPools[0] || "";

    // If there's a tie, check the tiebreaker model's vote
    if (tiedPools.length > 1) {
      const tiebreakerVote = validVotes.find(v => v.model === TIEBREAKER.split('/')[1].split(':')[0]);
      if (tiebreakerVote && tiedPools.includes(tiebreakerVote.vote)) {
        winner = tiebreakerVote.vote;
      }
    }

    return NextResponse.json({
      winner: winner || "No Consensus",
      totalVoters: VOTERS.length,
      activeVotes: validVotes.length,
      consensusRatio: `${maxVotes}/${validVotes.length}`,
      votes: validVotes
    });

  } catch (error: any) {
    console.error('Swarm API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
