'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Brain, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useYield } from '@/hooks/useYield';

export default function GlobalChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Hi! I'm your Flash Analyst. Ask me about any yield strategy, prediction market, or my overall risk assessment for the Solana ecosystem today." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { tokens: portfolio } = usePortfolio();
  const { strategies } = useYield();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);
    setChatError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          portfolio,
          strategies,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'AI request failed');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.content }]);
    } catch (err: any) {
      const fallback = "I'm having trouble reaching my neural mesh right now. Try again in a moment.";
      setMessages(prev => [...prev, { role: 'ai', content: fallback }]);
      setChatError(err.message);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, portfolio, strategies]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-purple-600 hover:bg-purple-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center transition-all z-50 ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
      >
        <MessageSquare size={24} className="text-white" />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 w-[350px] md:w-[400px] h-[500px] bg-[#0d0d12]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col transition-all duration-300 transform origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
              <Sparkles size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">Flash Analyst <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span></h3>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">PrivyFi AI Swarm</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white rounded-br-sm' 
                  : 'bg-white/5 border border-white/5 text-gray-300 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/5 p-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                <Loader2 size={14} className="text-purple-400 animate-spin" />
                <span className="text-xs text-gray-400">Analyst is typing...</span>
              </div>
            </div>
          )}
          {chatError && (
            <div className="flex justify-center">
              <div className="text-[10px] text-red-400/60 flex items-center gap-1">
                <AlertCircle size={10} /> {chatError}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5 bg-black/20 rounded-b-3xl">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 relative"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for yield alpha..."
              className="bg-white/5 border-white/10 rounded-xl pr-12 text-sm focus:ring-purple-500/50"
            />
            <Button 
              type="submit"
              disabled={!input.trim() || isTyping}
              size="icon"
              className="absolute right-1 top-1 bottom-1 w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Send size={14} />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
