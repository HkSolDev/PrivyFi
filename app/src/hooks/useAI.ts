import { useState } from 'react';
import { usePortfolio } from './usePortfolio';
import { useYield } from './useYield';
import { useAnchorProgram } from './useAnchorProgram';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function useAI() {
  const { tokens: portfolio } = usePortfolio();
  const { strategies } = useYield();
  const { getUserPositions, wallet } = useAnchorProgram();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setLoading(true);
    setError(null);

    try {
      let stakedPositions: any[] = [];
      if (wallet) {
        const positions = await getUserPositions();
        stakedPositions = positions.map((p: any) => ({
          pool: 'PrivyFi Vault',
          amount: (p.account.amount.toNumber() / 1000000).toLocaleString()
        }));
      }

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages,
          portfolio: portfolio, // Pass real portfolio data
          staked: stakedPositions, // Pass PrivyFi staked data
          strategies // Pass live yield data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      if (typeof content === 'string') {
        content = content.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
      }
      
      const botMessage: Message = { ...data.choices[0].message, content };
      
      setMessages([...updatedMessages, botMessage]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { messages, sendMessage, loading, error };
}
