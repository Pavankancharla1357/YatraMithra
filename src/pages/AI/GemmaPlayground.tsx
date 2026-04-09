import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, Bot, User, Loader2, ArrowLeft, Trash2, Zap, Brain, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: 'gemma' | 'gemini';
}

export const GemmaPlayground: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_1
      ].filter(k => k && k !== '');

      if (keys.length === 0) {
        throw new Error("Gemini API Key is missing. Please add it in the Settings menu.");
      }

      const tryWithKey = async (apiKey: string) => {
        const ai = new GoogleGenAI({ apiKey });
        
        // Map history
        const contents = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));
        
        // Add current input
        contents.push({
          role: 'user',
          parts: [{ text: currentInput }]
        });

        const tryModel = async (modelName: string) => {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: "You are a helpful travel assistant. You are part of the YatraMitra platform.",
            }
          });
          return response.text;
        };

        const models = ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-flash-lite-preview"];
        let lastModelError: any = null;

        for (const model of models) {
          try {
            const output = await tryModel(model);
            return { model: 'gemini', output };
          } catch (modelError: any) {
            lastModelError = modelError;
            if (
              modelError.message?.includes('503') || 
              modelError.message?.includes('UNAVAILABLE') ||
              modelError.message?.includes('404') ||
              modelError.message?.includes('not found')
            ) {
              continue;
            }
            throw modelError;
          }
        }
        throw lastModelError;
      };

      let result: { model: string, output: string } | null = null;
      let lastErr: any = null;
      for (const key of keys) {
        try {
          result = await tryWithKey(key!);
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`API Key ${key?.substring(0, 5)}... failed in Playground:`, err.message);
          if (err.message?.includes('503') || err.message?.includes('high demand')) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }
      }

      if (lastErr) throw lastErr;

      const assistantMessage: Message = {
        role: 'assistant',
        content: result?.output || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
        model: result?.model as any
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat Error:', err);
      setError(err.message || 'Failed to connect to AI. Please ensure your API key is valid.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                <Brain className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">Gemma 4 Playground</h1>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Experimental Model</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">Welcome to the Future</h2>
              <p className="text-gray-500 max-w-md font-medium">
                Experience the power of Gemma 4, Google's latest open-source frontier. Ask about travel, culture, or anything on your mind.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full max-w-2xl">
                {[
                  "Plan a 3-day cultural tour of Hampi",
                  "Explain the significance of Holi in different regions",
                  "What are the best offbeat places in Himachal?",
                  "Write a short travel story about a train journey in India"
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="p-4 bg-white border border-gray-100 rounded-2xl text-left hover:border-purple-300 hover:shadow-md transition-all group"
                  >
                    <p className="text-sm font-bold text-gray-700 group-hover:text-purple-700">{suggestion}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-indigo-600' : 'bg-purple-600'
                    }`}>
                      {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div className={`text-[10px] mt-2 font-bold flex items-center gap-2 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.model && (
                          <span className="uppercase tracking-widest px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            Gemini 3
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 rounded-tl-none shadow-sm flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                      <span className="text-sm font-bold text-gray-500">Gemini 3 is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                  <Zap className="w-4 h-4" />
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message Gemma 4..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 pr-12 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium resize-none max-h-32"
                rows={1}
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <Zap className="w-3 h-3 text-purple-400" />
                Fast
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-4 rounded-2xl transition-all shadow-lg ${
                !input.trim() || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200 active:scale-95'
              }`}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">
            Gemma 4 may provide inaccurate info. Verify important travel details.
          </p>
        </div>
      </div>
    </div>
  );
};
