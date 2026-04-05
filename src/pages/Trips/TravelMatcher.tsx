import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  User,
  Heart, 
  Zap, 
  Target, 
  AlertCircle, 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Compass,
  IndianRupee,
  Smile,
  MessageSquare,
  Plane
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { findSoulmate, SoulmateResult, MatcherUser } from "../../services/geminiMatcherService";
import { db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../components/Auth/AuthContext";
import { Capacitor } from "@capacitor/core";

const TravelMatcher: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SoulmateResult | null>(() => {
    const saved = sessionStorage.getItem("soulmate_result");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing Compatibility...");

  const [userA, setUserA] = useState<MatcherUser>(() => {
    const saved = sessionStorage.getItem("matcher_user_a");
    return saved ? JSON.parse(saved) : {
      budget: "",
      style: "adventure",
      interests: "",
      personality: "mixed"
    };
  });

  useEffect(() => {
    if (result) {
      sessionStorage.setItem("soulmate_result", JSON.stringify(result));
    } else {
      sessionStorage.removeItem("soulmate_result");
    }
  }, [result]);

  useEffect(() => {
    sessionStorage.setItem("matcher_user_a", JSON.stringify(userA));
  }, [userA]);

  const handleUserAChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserA(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError("You must be logged in to find a soulmate.");
      return;
    }

    setLoading(true);
    setError(null);

    const messages = [
      "Searching for potential matches...",
      "Comparing travel styles...",
      "Finding common interests...",
      "Analyzing personality dynamics...",
      "Calculating compatibility score...",
      "Identifying your Travel Soulmate..."
    ];

    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 2000);

    try {
      // 1. Fetch other users
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '!=', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const otherUsers = querySnapshot.docs.map(doc => doc.data());

      if (otherUsers.length === 0) {
        throw new Error("No other travelers found in the application yet. Invite some friends!");
      }

      // 2. Find soulmate using Gemini
      const soulmateResult = await findSoulmate(userA, otherUsers);
      setResult(soulmateResult);
    } catch (err: any) {
      setError(err.message || "Failed to find your soulmate. Please try again.");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingMessage("Analyzing Compatibility...");
    }
  };

  const travelStyles = [
    { id: 'budget', label: 'Budget', icon: '💰' },
    { id: 'luxury', label: 'Luxury', icon: '✨' },
    { id: 'adventure', label: 'Adventure', icon: '🏔️' },
    { id: 'relaxed', label: 'Relaxed', icon: '🏖️' }
  ];

  const personalities = [
    { id: 'introvert', label: 'Introvert' },
    { id: 'extrovert', label: 'Extrovert' },
    { id: 'mixed', label: 'Mixed' }
  ];

  return (
    <div className={`min-h-screen bg-slate-50 ${isAndroid ? 'pb-32' : 'pb-16'} selection:bg-indigo-100 font-sans text-slate-900`}>
      {/* Background Accent */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-indigo-50/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-rose-50/30 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className={`bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 ${isAndroid ? 'pt-safe' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-95 text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-rose-500" />
            <h1 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-800">
              Soulmate Finder
            </h1>
          </div>
          <div className="w-8" />
        </div>
      </div>

      <div className={`max-w-4xl mx-auto px-4 ${isAndroid ? 'py-4' : 'py-8'} sm:py-10 relative z-10`}>
        {!result ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/30 text-center">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Find Your <span className="text-indigo-600">Travel Soulmate</span>
              </h2>
              <p className="text-slate-500 text-sm mt-2 font-medium">
                Compare preferences and see if you're compatible for your next big adventure.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-10">
              <div className="max-w-2xl mx-auto space-y-8">
                {/* User A Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                      <Users className="w-3 h-3" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Travel Profile</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <IndianRupee className="w-3 h-3" />
                        Budget (INR)
                      </label>
                      <input
                        type="number"
                        name="budget"
                        required
                        placeholder="e.g. 50000"
                        value={userA.budget}
                        onChange={handleUserAChange}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                        <Compass className="w-3 h-3" />
                        Travel Style
                      </label>
                      <select
                        name="style"
                        value={userA.style}
                        onChange={handleUserAChange}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium"
                      >
                        {travelStyles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                      <Smile className="w-3 h-3" />
                      Personality
                    </label>
                    <div className="flex gap-2">
                      {personalities.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setUserA(prev => ({ ...prev, personality: p.id }))}
                          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all ${
                            userA.personality === p.id 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                              : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      Interests
                    </label>
                    <textarea
                      name="interests"
                      required
                      placeholder="e.g. Hiking, local food, museums..."
                      value={userA.interests}
                      onChange={handleUserAChange}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="max-w-2xl mx-auto p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="max-w-2xl mx-auto pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {loadingMessage}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                      Find My Travel Soulmate
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Result Header */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-indigo-500 via-rose-500 to-indigo-500" />
              
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-50 border-4 border-indigo-50 relative">
                  <span className="text-3xl font-black text-slate-900">{result.compatibility_score}%</span>
                  <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white p-1.5 rounded-lg shadow-lg">
                    <Heart className="w-4 h-4 fill-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    It's a Match! Meet <span className="text-indigo-600">{result.soulmate_name}</span>
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      result.confidence_level === 'high' ? 'bg-emerald-50 text-emerald-600' : 
                      result.confidence_level === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                    }`}>
                      Match Score: {result.compatibility_score}%
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed max-w-xl mx-auto font-medium italic">
                  "{result.match_summary}"
                </p>

                <div className="pt-4 flex items-center justify-center gap-4">
                  <button 
                    onClick={() => {
                      setResult(null);
                      sessionStorage.removeItem("soulmate_result");
                    }}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Find Another
                  </button>
                  <button 
                    onClick={() => navigate(`/profile/${result.soulmate_uid}`)}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:text-indigo-700 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    View Profile
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Common Interests */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
              >
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Common Ground
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.common_interests.map((interest, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                      {interest}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Differences */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
              >
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  Key Differences
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.differences.map((diff, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold">
                      {diff}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Suggested Trip */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="md:col-span-2 bg-indigo-600 rounded-xl p-8 shadow-lg shadow-indigo-100 text-white relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Compass className="w-32 h-32 rotate-12" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Perfect Trip Type
                    </h3>
                    <p className="text-2xl font-bold tracking-tight">{result.suggested_trip_type}</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigate('/expert-planner', { 
                        state: { 
                          suggestedTrip: result.suggested_trip_type,
                          budget: userA.budget,
                          style: userA.style
                        } 
                      });
                    }}
                    className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-50 transition-all active:scale-95"
                  >
                    Plan This Trip
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelMatcher;
