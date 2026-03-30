import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Compass, 
  Send, 
  Loader2, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Info, 
  Package, 
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Heart,
  Plane
} from "lucide-react";
import { generateFullItinerary, FullItinerary } from "../../services/geminiItineraryService";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../components/Auth/AuthContext";
import { Capacitor } from "@capacitor/core";

const ExpertTravelPlanner: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<FullItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);

  const [formData, setFormData] = useState({
    destination: "",
    days: 3,
    budget: "",
    style: "relaxed",
    startLocation: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (profile && !formData.startLocation) {
      const city = profile.location_city || "";
      const country = profile.location_country || "";
      setFormData(prev => ({
        ...prev,
        startLocation: city && country ? `${city}, ${country}` : city || country || ""
      }));
    }
  }, [profile, formData.startLocation]);

  useEffect(() => {
    if (location.state?.suggestedTrip) {
      const newFormData = {
        ...formData,
        destination: location.state.suggestedTrip,
        budget: location.state.budget || formData.budget,
        style: location.state.style || formData.style,
      };
      
      setFormData(newFormData);

      // Auto-submit if we have all required info
      if (newFormData.destination && newFormData.startLocation && newFormData.budget) {
        // Use a small delay to ensure state is updated and UI feels responsive
        const timer = setTimeout(() => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSubmit(fakeEvent, newFormData);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [location.state]);

  const [loadingMessage, setLoadingMessage] = useState("Crafting Your Journey...");

  const handleSubmit = async (e: React.FormEvent, dataToUse = formData) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const messages = [
      "Analyzing your travel style...",
      "Searching for the best local spots...",
      "Optimizing your daily route...",
      "Calculating estimated costs...",
      "Finalizing your expert plan..."
    ];
    
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 2000);

    try {
      const result = await generateFullItinerary(
        dataToUse.destination,
        dataToUse.days,
        dataToUse.budget,
        dataToUse.style,
        dataToUse.startLocation
      );
      setItinerary(result);
      setExpandedDays([1]);
    } catch (err: any) {
      setError(err.message || "Failed to generate itinerary. Please try again.");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingMessage("Crafting Your Journey...");
    }
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const travelStyles = [
    { id: 'budget', label: 'Budget', icon: '💰' },
    { id: 'luxury', label: 'Luxury', icon: '✨' },
    { id: 'adventure', label: 'Adventure', icon: '🏔️' },
    { id: 'relaxed', label: 'Relaxed', icon: '🏖️' }
  ];

  return (
    <div className={`min-h-screen bg-slate-50 ${isAndroid ? 'pb-32' : 'pb-16'} selection:bg-indigo-100 font-sans text-slate-900`}>
      {/* Subtle Background Accent */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-indigo-50/40 rounded-full blur-[100px]" />
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
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center shadow-sm">
              <Compass className="text-white w-4 h-4" />
            </div>
            <h1 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-800">
              YatraMitra AI
            </h1>
          </div>
          <button 
            onClick={() => navigate('/travel-matcher')}
            className="p-2 hover:bg-rose-50 rounded-xl transition-all active:scale-95 text-rose-500 flex items-center gap-2"
            title="Check Compatibility"
          >
            <Heart className="w-4 h-4 fill-rose-500" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest">Matcher</span>
          </button>
        </div>
      </div>

      <div className={`max-w-3xl mx-auto px-4 ${isAndroid ? 'py-4' : 'py-8'} sm:py-10 relative z-10`}>
        {!itinerary ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/30">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Plan Your <span className="text-indigo-600">Perfect Journey</span>
              </h2>
              <p className="text-slate-500 text-sm mt-2 font-medium">
                Enter your details and let our AI craft a detailed day-wise itinerary for you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Destination */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    Destination
                  </label>
                  <input
                    type="text"
                    name="destination"
                    required
                    placeholder="e.g. Ladakh, India"
                    value={formData.destination}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-300"
                  />
                </div>

                {/* Start Location */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Compass className="w-3 h-3" />
                    Starting Point
                  </label>
                  <input
                    type="text"
                    name="startLocation"
                    required
                    placeholder="e.g. Hyderabad, India"
                    value={formData.startLocation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-300"
                  />
                </div>

                {/* Days */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Duration
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="days"
                      min="1"
                      max="14"
                      required
                      value={formData.days}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-slate-900"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Days</span>
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <IndianRupee className="w-3 h-3" />
                    Budget
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="budget"
                      required
                      placeholder="e.g. 50000"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-300"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">INR</span>
                  </div>
                </div>

                {/* Travel Style */}
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Travel Vibe
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {travelStyles.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, style: style.id }))}
                        className={`group py-3 px-3 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                          formData.style === style.id
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                            : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-lg">{style.icon}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          formData.style === style.id ? "text-white" : "text-slate-500"
                        }`}>
                          {style.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {loadingMessage}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Generate Itinerary
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Itinerary Header */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                    Custom Plan
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{itinerary.destination}</h2>
                  <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formData.days} Days
                    </span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {formData.style}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 px-5 py-3 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Estimated Budget</span>
                  <span className="text-xl font-bold text-indigo-600">{itinerary.total_estimated_budget}</span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setItinerary(null)}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  New Plan
                </button>
              </div>
            </motion.div>

            {/* Day Wise Plan */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1 uppercase tracking-widest">
                <Clock className="w-4 h-4 text-indigo-500" />
                The Journey
              </h3>
              
              {itinerary.days.map((day) => (
                <div key={day.day} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleDay(day.day)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                        {day.day}
                      </div>
                      <span className="text-sm font-bold text-slate-900">Day {day.day} Plan</span>
                    </div>
                    <div className={`p-1.5 rounded-lg transition-all ${expandedDays.includes(day.day) ? 'bg-indigo-50 text-indigo-600 rotate-180' : 'text-slate-300'}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedDays.includes(day.day) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 space-y-6">
                          {day.plan.map((item, idx) => (
                            <div key={idx} className="relative pl-8 border-l border-slate-100 last:border-0 pb-6 last:pb-0">
                              <div className="absolute left-[-4.5px] top-0 w-2 h-2 bg-indigo-600 rounded-full" />
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                    <Clock className="w-3 h-3" />
                                    {item.time}
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-900">{item.activity}</h4>
                                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-slate-300" />
                                    {item.location}
                                  </p>
                                </div>
                                <div className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md self-start">
                                  {item.cost_estimate}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Tips & Packing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tips */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-4 uppercase tracking-widest">
                  <Info className="w-4 h-4 text-amber-500" />
                  Expert Tips
                </h3>
                <ul className="space-y-3">
                  {itinerary.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Packing */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-4 uppercase tracking-widest">
                  <Package className="w-4 h-4 text-indigo-500" />
                  Packing List
                </h3>
                <ul className="space-y-3">
                  {itinerary.packing_suggestions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertTravelPlanner;
