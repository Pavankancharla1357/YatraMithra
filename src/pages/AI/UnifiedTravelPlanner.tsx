import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Bot, User, Loader2, MapPin, 
  Calendar, IndianRupee, Compass, Zap, Brain, 
  MessageSquare, ChevronRight, Plane, Info,
  CheckCircle2, AlertCircle, Trash2, Clock, 
  Utensils, Hotel, Car, Lightbulb, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: 'gemma' | 'gemini';
  isStructured?: boolean;
}

interface ItineraryData {
  overview: {
    destination: string;
    route: string;
    budget: string;
    vibe: string;
    transport: string[];
  };
  days: {
    day: number;
    title: string;
    morning: string;
    afternoon: string;
    evening: string;
    food?: string;
    stay?: string;
    travel?: string;
  }[];
  budgetBreakdown: {
    category: string;
    amount: string;
    icon: string;
  }[];
  tips: {
    type: 'Transport' | 'Food' | 'Gear' | 'Safety' | 'General';
    content: string;
  }[];
  mustVisit: string[];
}

interface FormData {
  destination: string;
  startingPoint: string;
  duration: string;
  budget: string;
  vibe: 'Budget' | 'Luxury' | 'Adventure' | 'Relaxed';
}

export const UnifiedTravelPlanner: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    destination: '',
    startingPoint: '',
    duration: '3',
    budget: '15000',
    vibe: 'Adventure'
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (prompt: string, type: 'chat' | 'itinerary', history: Message[] = []) => {
    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1
    ].filter(k => k && k !== '');

    if (keys.length === 0) {
      throw new Error("Gemini API Key is missing. Please add it in the Settings menu.");
    }

    // Convert history to Gemini format
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add the current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const tryWithKey = async (apiKey: string) => {
      const ai = new GoogleGenAI({ apiKey });
      
      const tryModel = async (modelName: string) => {
        const config: any = {
          systemInstruction: type === "itinerary" 
            ? "You are a professional travel itinerary generator. Provide detailed, structured, and inspiring travel plans in JSON format."
            : "You are a helpful travel assistant. Answer questions about destinations, culture, and travel tips conversationally.",
        };

        if (type === 'itinerary') {
          config.responseMimeType = "application/json";
          config.responseSchema = {
            type: Type.OBJECT,
            properties: {
              overview: {
                type: Type.OBJECT,
                properties: {
                  destination: { type: Type.STRING },
                  route: { type: Type.STRING },
                  budget: { type: Type.STRING },
                  vibe: { type: Type.STRING },
                  transport: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["destination", "route", "budget", "vibe", "transport"]
              },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    morning: { type: Type.STRING },
                    afternoon: { type: Type.STRING },
                    evening: { type: Type.STRING },
                    food: { type: Type.STRING },
                    stay: { type: Type.STRING },
                    travel: { type: Type.STRING }
                  },
                  required: ["day", "title", "morning", "afternoon", "evening"]
                }
              },
              budgetBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    amount: { type: Type.STRING },
                    icon: { type: Type.STRING }
                  },
                  required: ["category", "amount", "icon"]
                }
              },
              tips: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["type", "content"]
                }
              },
              mustVisit: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["overview", "days", "budgetBreakdown", "tips", "mustVisit"]
          };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config
        });
        return response.text;
      };

      // Try models in order of preference
      const models = ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-flash-lite-preview"];
      let lastModelError: any = null;

      for (const model of models) {
        try {
          const output = await tryModel(model);
          return { model: 'gemini' as const, output };
        } catch (modelError: any) {
          lastModelError = modelError;
          console.log(`Model ${model} failed with key ${apiKey.substring(0, 5)}...:`, modelError.message);
          // If it's a 503 or 404, try the next model
          if (
            modelError.message?.includes('503') || 
            modelError.message?.includes('UNAVAILABLE') ||
            modelError.message?.includes('404') ||
            modelError.message?.includes('not found')
          ) {
            continue;
          }
          // For other errors (like quota), we might want to switch keys instead of models
          throw modelError;
        }
      }
      throw lastModelError;
    };

    let lastError: any = null;
    for (const key of keys) {
      try {
        return await tryWithKey(key!);
      } catch (err: any) {
        lastError = err;
        console.warn(`API Key ${key?.substring(0, 5)}... failed:`, err.message);
        // If it's a temporary error, try the next key
        if (
          err.message?.includes('API key not valid') || 
          err.message?.includes('quota') || 
          err.message?.includes('429') ||
          err.message?.includes('503') ||
          err.message?.includes('UNAVAILABLE') ||
          err.message?.includes('high demand')
        ) {
          // Small delay before trying next key if it was a 503
          if (err.message?.includes('503') || err.message?.includes('high demand')) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          continue;
        }
      }
    }

    console.error("All API keys failed:", lastError);
    if (lastError?.message?.includes('API key not valid')) {
      throw new Error("The Gemini API keys provided are invalid. Please check your API keys in the Settings menu.");
    }
    throw new Error(lastError?.message || "Failed to generate AI response after trying all keys");
  };

  const handleGenerateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination.trim() || isLoading) {
      toast.error("Please enter a destination");
      return;
    }

    setIsLoading(true);
    const userMsg: Message = {
      role: 'user',
      content: `Generate a ${formData.duration}-day ${formData.vibe} itinerary for ${formData.destination} starting from ${formData.startingPoint} with a budget of ₹${formData.budget}.`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const prompt = `You are an expert travel planner.
User details:
* Destination: ${formData.destination}
* Starting point: ${formData.startingPoint}
* Duration: ${formData.duration} days
* Budget: ${formData.budget} INR
* Travel vibe: ${formData.vibe}

Generate:
1. Day-wise itinerary
2. Estimated budget breakdown
3. Travel tips
4. Must-visit places

Make it engaging and easy to read.`;

      const result = await generateAIResponse(prompt, 'itinerary', messages);

      const assistantMsg: Message = {
        role: 'assistant',
        content: result.output || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
        model: result.model as 'gemma' | 'gemini',
        isStructured: true
      };
      setMessages(prev => [...prev, assistantMsg]);
      toast.success(`Itinerary generated successfully`);
    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || "Failed to generate itinerary");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const result = await generateAIResponse(currentInput, 'chat', messages);

      const assistantMsg: Message = {
        role: 'assistant',
        content: result.output || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
        model: result.model as 'gemma' | 'gemini',
        isStructured: false
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const vibes: FormData['vibe'][] = ['Budget', 'Luxury', 'Adventure', 'Relaxed'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
              <Sparkles className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">YatraMitra AI</h1>
              <p className="text-sm font-bold text-gray-500">Plan your perfect journey with AI</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Gemini 3 Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Flash Backup</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 p-0 lg:p-8">
        {/* Left Panel: Form */}
        <div className="lg:col-span-4 bg-white lg:rounded-[2.5rem] border-b lg:border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Plane className="w-5 h-5 text-indigo-600" />
              Trip Details
            </h2>
          </div>
          
          <form onSubmit={handleGenerateItinerary} className="p-8 space-y-6 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Destination
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={e => setFormData({...formData, destination: e.target.value})}
                placeholder="e.g. Manali, Himachal Pradesh"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Compass className="w-3 h-3" /> Starting Point
              </label>
              <input
                type="text"
                value={formData.startingPoint}
                onChange={e => setFormData({...formData, startingPoint: e.target.value})}
                placeholder="e.g. Delhi"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <IndianRupee className="w-3 h-3" /> Budget (INR)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={formData.budget}
                  onChange={e => setFormData({...formData, budget: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Travel Vibe</label>
              <div className="grid grid-cols-2 gap-2">
                {vibes.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFormData({...formData, vibe: v})}
                    className={`py-3 rounded-xl text-xs font-black transition-all border ${
                      formData.vibe === v 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Generate Itinerary
                </>
              )}
            </button>
          </form>
          
          <div className="mt-auto p-6 bg-indigo-50/50 border-t border-indigo-100/50">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-indigo-600/70 leading-relaxed">
                Our AI considers local weather, trending spots, and your budget to create a personalized plan.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel: Chat */}
        <div className="lg:col-span-8 bg-white lg:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[600px] lg:h-auto relative overflow-hidden">
          {/* Chat Header */}
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-black text-gray-900">AI Assistant</h2>
            </div>
            <button 
              onClick={() => setMessages([])}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-6">
                  <Bot className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Ready to explore?</h3>
                <p className="text-gray-500 font-medium max-w-xs">
                  Fill out the form on the left or ask me anything about your next trip!
                </p>
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
                    <div className={`flex gap-3 ${msg.isStructured ? 'max-w-full w-full' : 'max-w-[90%]'} ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                        msg.role === 'user' ? 'bg-indigo-600' : 'bg-white border border-gray-100'
                      }`}>
                        {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-indigo-600" />}
                      </div>
                      <div className="space-y-1">
                        <div className={`p-5 rounded-2xl shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                        }`}>
                          {msg.isStructured ? (
                            <StructuredItinerary content={msg.content} />
                          ) : (
                            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-gray-900 prose-headings:font-black prose-strong:text-indigo-600">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] font-bold text-gray-400">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.model && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
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
                      <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center shadow-sm">
                        <Bot className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-gray-100 rounded-tl-none shadow-sm flex items-center gap-3">
                        <div className="flex gap-1">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">AI is crafting your plan...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-6 bg-white border-t border-gray-50">
            <div className="relative flex items-center gap-3">
              <div className="flex-1 relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about destinations, food, or travel tips..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 pr-12 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-gray-700"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest group-focus-within:text-indigo-400 transition-colors">
                    AI Chat
                  </span>
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={`p-4 rounded-2xl transition-all shadow-lg ${
                  !input.trim() || isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 active:scale-95'
                }`}
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const StructuredItinerary: React.FC<{ content: string }> = ({ content }) => {
  let data: ItineraryData;
  try {
    data = JSON.parse(content);
  } catch (e) {
    return <div className="text-red-500 font-bold">Error parsing itinerary data.</div>;
  }

  return (
    <div className="space-y-8 py-4">
      {/* Overview Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Plane className="w-32 h-32 rotate-12" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-3xl font-black tracking-tight">{data.overview.destination}</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Route</p>
              <p className="font-bold flex items-center gap-2">
                {data.overview.route}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Budget</p>
              <p className="font-bold">{data.overview.budget}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Vibe</p>
              <p className="font-bold">{data.overview.vibe}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Transport</p>
              <div className="flex flex-wrap gap-1">
                {data.overview.transport.map((t, i) => (
                  <span key={i} className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-black uppercase">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Day-wise Itinerary */}
      <div className="space-y-6 relative">
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-indigo-100 hidden md:block" />
        <h4 className="text-xl font-black text-gray-900 flex items-center gap-3">
          <Calendar className="w-6 h-6 text-indigo-600" />
          Daily Journey
        </h4>
        <div className="space-y-8">
          {data.days.map((day, idx) => (
            <DayCard key={idx} day={day} />
          ))}
        </div>
      </div>

      {/* Budget Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-6">
          <h4 className="text-xl font-black text-gray-900 flex items-center gap-3">
            <IndianRupee className="w-6 h-6 text-green-600" />
            Budget Breakdown
          </h4>
          <div className="grid grid-cols-1 gap-4">
            {data.budgetBreakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl">
                    {item.icon}
                  </div>
                  <span className="font-bold text-gray-700">{item.category}</span>
                </div>
                <span className="font-black text-indigo-600">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Must Visit */}
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-6">
          <h4 className="text-xl font-black text-gray-900 flex items-center gap-3">
            <Compass className="w-6 h-6 text-orange-600" />
            Must-Visit Places
          </h4>
          <div className="flex flex-wrap gap-3">
            {data.mustVisit.map((place, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.05 }}
                className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-sm border border-indigo-100 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {place}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Travel Tips */}
      <div className="bg-indigo-900 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-indigo-100">
        <h4 className="text-xl font-black flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-yellow-400" />
          Pro Travel Tips
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.tips.map((tip, idx) => (
            <div key={idx} className="flex gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="shrink-0">
                {tip.type === 'Transport' && <Car className="w-5 h-5 text-blue-300" />}
                {tip.type === 'Food' && <Utensils className="w-5 h-5 text-orange-300" />}
                {tip.type === 'Gear' && <Zap className="w-5 h-5 text-purple-300" />}
                {tip.type === 'Safety' && <ShieldCheck className="w-5 h-5 text-green-300" />}
                {tip.type === 'General' && <Info className="w-5 h-5 text-indigo-300" />}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{tip.type}</p>
                <p className="text-sm font-medium leading-relaxed">{tip.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DayCard: React.FC<{ day: ItineraryData['days'][0] }> = ({ day }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div 
      layout
      className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group"
    >
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-indigo-100">
            <span className="text-[10px] font-black uppercase leading-none">Day</span>
            <span className="text-xl font-black leading-none">{day.day}</span>
          </div>
          <h5 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{day.title}</h5>
        </div>
        <ChevronRight className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                  <div className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> Morning
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{day.morning}</p>
                </div>
                <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> Afternoon
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{day.afternoon}</p>
                </div>
                <div className="space-y-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                  <div className="flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-widest">
                    <Clock className="w-3 h-3" /> Evening
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{day.evening}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-50">
                {day.food && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <Utensils className="w-4 h-4 text-orange-400" />
                    <span>Food: {day.food}</span>
                  </div>
                )}
                {day.stay && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <Hotel className="w-4 h-4 text-blue-400" />
                    <span>Stay: {day.stay}</span>
                  </div>
                )}
                {day.travel && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <Car className="w-4 h-4 text-indigo-400" />
                    <span>Travel: {day.travel}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
