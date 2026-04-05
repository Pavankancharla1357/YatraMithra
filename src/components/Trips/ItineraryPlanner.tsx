import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ThumbsUp, 
  MapPin, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  Utensils, 
  Plane, 
  Bed, 
  Camera, 
  MoreHorizontal,
  Check,
  CalendarDays,
  MessageSquare,
  IndianRupee,
  Sparkles,
  Send,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { getAiItinerarySuggestions, ItinerarySuggestion } from '../../services/geminiItineraryService';

interface ItineraryPlannerProps {
  tripId: string;
  isMember: boolean;
  isOrganizer: boolean;
  initialItinerary?: any;
  destination?: string;
  travelStyle?: string;
}

const ACTIVITY_TYPES = [
  { id: 'activity', label: 'Activity', icon: Camera, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'dining', label: 'Dining', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'transport', label: 'Transport', icon: Plane, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'lodging', label: 'Lodging', icon: Bed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-50' },
];

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({ tripId, isMember, isOrganizer, initialItinerary, destination, travelStyle }) => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ title: '', location: '', time: '', day: 1, type: 'activity', budget: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [aiSuggestions, setAiSuggestions] = useState<ItinerarySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, `trips/${tripId}/itinerary`), orderBy('day', 'asc'), orderBy('votes_count', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [tripId]);

  const days = useMemo(() => {
    const uniqueDays = Array.from(new Set(items.map(item => item.day)));
    if (uniqueDays.length === 0) return [1];
    return uniqueDays.sort((a, b) => a - b);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => item.day === activeDay);
  }, [items, activeDay]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItem.title.trim()) return;

    try {
      await addDoc(collection(db, `trips/${tripId}/itinerary`), {
        trip_id: tripId,
        title: newItem.title.trim(),
        location: newItem.location.trim(),
        time: newItem.time.trim(),
        day: newItem.day,
        type: newItem.type,
        budget: newItem.budget.trim(),
        created_by: user.uid,
        created_by_name: profile?.name || 'Member',
        votes: [],
        votes_count: 0,
        status: 'proposed',
        comments: [],
        created_at: serverTimestamp()
      });
      setNewItem({ title: '', location: '', time: '', day: activeDay, type: 'activity', budget: '' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}/itinerary`);
    }
  };

  const handleVote = async (itemId: string, hasVoted: boolean) => {
    if (!user || !isMember) return;
    const itemRef = doc(db, `trips/${tripId}/itinerary`, itemId);
    
    try {
      await updateDoc(itemRef, {
        votes: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid),
        votes_count: increment(hasVoted ? -1 : 1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/itinerary/${itemId}`);
    }
  };

  const handleConfirm = async (itemId: string, currentStatus: string) => {
    if (!isOrganizer) return;
    const itemRef = doc(db, `trips/${tripId}/itinerary`, itemId);
    
    try {
      await updateDoc(itemRef, {
        status: currentStatus === 'confirmed' ? 'proposed' : 'confirmed'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/itinerary/${itemId}`);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) return;
    
    try {
      await deleteDoc(doc(db, `trips/${tripId}/itinerary`, itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/itinerary/${itemId}`);
    }
  };

  const handleAddComment = async (itemId: string) => {
    const text = newComment[itemId]?.trim();
    if (!text || !user) return;

    try {
      const comment = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Traveler',
        userPhoto: profile?.photo_url || user.photoURL || undefined,
        text,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, `trips/${tripId}/itinerary`, itemId), {
        comments: arrayUnion(comment)
      });
      setNewComment(prev => ({ ...prev, [itemId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const fetchAiSuggestions = async () => {
    if (!destination) return;
    setLoadingSuggestions(true);
    setShowAiPanel(true);
    setAiError(null);
    try {
      const suggestions = await getAiItinerarySuggestions(
        destination,
        travelStyle || 'General',
        items.map(i => i.title)
      );
      setAiSuggestions(suggestions);
      if (suggestions.length === 0) {
        setAiError("No suggestions were returned. Try a different travel style or destination.");
      }
    } catch (err: any) {
      console.error('Error fetching suggestions:', err);
      setAiError(err.message || "Failed to fetch AI suggestions. Please check your connection and try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addAiSuggestion = async (suggestion: ItinerarySuggestion) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `trips/${tripId}/itinerary`), {
        trip_id: tripId,
        title: suggestion.title,
        description: suggestion.description,
        type: (suggestion.category || '').toLowerCase().includes('food') ? 'dining' : 'activity',
        budget: suggestion.estimatedCost,
        day: activeDay,
        created_by: user.uid,
        created_by_name: profile?.name || 'AI Assistant',
        votes: [],
        votes_count: 0,
        status: 'proposed',
        comments: [],
        created_at: serverTimestamp()
      });
      setAiSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
    } catch (error) {
      console.error('Error adding AI suggestion:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    const config = ACTIVITY_TYPES.find(t => t.id === type) || ACTIVITY_TYPES[4];
    return <config.icon className={`w-5 h-5 ${config.color}`} />;
  };

  const getTypeStyle = (type: string) => {
    const config = ACTIVITY_TYPES.find(t => t.id === type) || ACTIVITY_TYPES[4];
    return `${config.bg} ${config.color}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Itinerary Planner</h3>
          <p className="text-sm text-gray-500 mt-1">Collaborate with your group to plan the perfect trip.</p>
        </div>
        <div className="flex space-x-2">
          {isMember && destination && (
            <button
              onClick={fetchAiSuggestions}
              className="flex items-center space-x-2 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-bold hover:bg-indigo-100 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Suggestions</span>
            </button>
          )}
          {isMember && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              <span>Propose Activity</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Suggestions Panel */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-indigo-50 rounded-[2rem] p-6 border border-indigo-100 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-indigo-900">AI Activity Suggestions for {destination}</h4>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="text-indigo-400 hover:text-indigo-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingSuggestions ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-sm text-indigo-600 font-medium">Gemini is crafting unique experiences...</p>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiSuggestions.map((suggestion, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">
                        {suggestion.category}
                      </span>
                      <div className="flex items-center text-[10px] font-bold text-gray-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {suggestion.duration}
                      </div>
                    </div>
                    <h5 className="font-bold text-gray-900 mb-2">{suggestion.title}</h5>
                    <p className="text-xs text-gray-500 mb-4 flex-grow leading-relaxed">{suggestion.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                      <div className="flex items-center text-xs font-bold text-indigo-600">
                        <IndianRupee className="w-3 h-3 mr-1" />
                        {suggestion.estimatedCost}
                      </div>
                      <button
                        onClick={() => addAiSuggestion(suggestion)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                {aiError ? (
                  <div className="flex flex-col items-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-red-600 font-medium">{aiError}</p>
                    <button 
                      onClick={fetchAiSuggestions}
                      className="text-indigo-600 text-sm font-bold hover:underline"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <p className="text-indigo-600 font-medium">No suggestions found. Try again or check back later.</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Tabs */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
              activeDay === day 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-105' 
                : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-100 hover:text-indigo-600'
            }`}
          >
            Day {day}
          </button>
        ))}
        {isMember && !days.includes(days[days.length - 1] + 1) && (
          <button
            onClick={() => {
              const nextDay = days[days.length - 1] + 1;
              setActiveDay(nextDay);
              setIsAdding(true);
              setNewItem(prev => ({ ...prev, day: nextDay }));
            }}
            className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border-2 border-dashed border-gray-200"
            title="Add Day"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-50 shadow-2xl shadow-indigo-100/20"
          >
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-lg font-black text-gray-900 tracking-tight">Propose Activity for Day {newItem.day}</h4>
              <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Activity Title</label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="e.g., Sunrise at the Beach"
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Activity Type</label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITY_TYPES.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, type: type.id })}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          newItem.type === type.id 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                            : 'bg-white text-gray-400 border-gray-100 hover:border-indigo-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={newItem.location}
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                      placeholder="Where is it?"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={newItem.time}
                      onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                      placeholder="e.g., 10:00 AM"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Budget</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={newItem.budget}
                      onChange={(e) => setNewItem({ ...newItem, budget: e.target.value })}
                      placeholder="e.g., ₹500"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-4 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:text-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  Propose Activity
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Timeline Line */}
        {filteredItems.length > 0 && (
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-50 -z-10 rounded-full" />
        )}

        <div className="space-y-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-gray-200/50">
                <CalendarDays className="w-10 h-10 text-gray-200" />
              </div>
              <h4 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">No plans for Day {activeDay} yet</h4>
              <p className="text-gray-500 max-w-xs mx-auto mb-10 font-medium leading-relaxed">Start proposing activities to build your trip itinerary together.</p>
              {isMember && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-10 py-5 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-50"
                >
                  Propose First Activity
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const hasVoted = item.votes?.includes(user?.uid);
              const isCreator = item.created_by === user?.uid;
              const isConfirmed = item.status === 'confirmed';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative flex items-start group ${isConfirmed ? 'opacity-100' : 'opacity-90'}`}
                >
                  {/* Timeline Node */}
                  <div className={`mt-8 w-5 h-5 rounded-full border-4 border-white shadow-md z-10 transition-all duration-500 ${
                    isConfirmed ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-50' : 'bg-gray-300'
                  }`} />

                  <div className={`ml-10 flex-1 bg-white p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${
                    isConfirmed 
                      ? 'border-indigo-100 shadow-2xl shadow-indigo-100/30 ring-1 ring-indigo-50' 
                      : 'border-gray-50 shadow-xl shadow-gray-100/30 hover:border-indigo-100 hover:shadow-indigo-100/20'
                  }`}>
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                      <div className="flex-1 w-full">
                        <div className="flex items-center flex-wrap gap-3 mb-5">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm ${getTypeStyle(item.type)}`}>
                            {getTypeIcon(item.type)}
                            <span className="ml-2">{item.type}</span>
                          </span>
                          {isConfirmed && (
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center shadow-sm border border-emerald-100">
                              <Check className="w-3 h-3 mr-2" strokeWidth={3} />
                              Confirmed
                            </span>
                          )}
                          {item.votes_count >= 3 && !isConfirmed && (
                            <span className="px-4 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center shadow-sm border border-amber-100">
                              <Sparkles className="w-3 h-3 mr-2" />
                              Popular
                            </span>
                          )}
                        </div>
                        
                        <h4 className={`text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight ${isConfirmed ? 'text-indigo-900' : ''}`}>
                          {item.title}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          {item.time && (
                            <div className="flex items-center p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Clock className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</p>
                                <p className="text-sm font-bold text-gray-700">{item.time}</p>
                              </div>
                            </div>
                          )}
                          {item.location && (
                            <div className="flex items-center p-3 bg-gray-50 rounded-2xl border border-gray-100/50">
                              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <MapPin className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div className="truncate">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                                <p className="text-sm font-bold text-gray-700 truncate">{item.location}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center mr-3 text-xs font-black text-indigo-600 border border-indigo-100">
                              {item.created_by_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proposed By</p>
                              <p className="text-xs font-bold text-gray-600">{item.created_by_name}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                              className={`p-3 rounded-2xl transition-all relative ${expandedItem === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                              title="Comments"
                            >
                              <MessageSquare className="w-5 h-5" />
                              {item.comments?.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                  {item.comments.length}
                                </span>
                              )}
                            </button>
                            {isOrganizer && (
                              <button
                                onClick={() => handleConfirm(item.id, item.status)}
                                className={`p-3 rounded-2xl transition-all ${
                                  isConfirmed 
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                                    : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                                }`}
                                title={isConfirmed ? "Unconfirm Activity" : "Confirm Activity"}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                            )}
                            {(isCreator || isOrganizer) && (
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Comments Section */}
                        <AnimatePresence>
                          {expandedItem === item.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-8 pt-8 border-t border-gray-100 overflow-hidden"
                            >
                              <div className="space-y-6 mb-8">
                                {item.comments && item.comments.length > 0 ? (
                                  item.comments.map((comment: any) => (
                                    <div key={comment.id} className="flex space-x-4">
                                      <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex-shrink-0 overflow-hidden border border-indigo-100 shadow-sm">
                                        {comment.userPhoto ? (
                                          <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-xs font-black text-indigo-400">
                                            {comment.userName.charAt(0)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 bg-gray-50 p-5 rounded-3xl border border-gray-100/50">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-xs font-black text-gray-900">{comment.userName}</span>
                                          <span className="text-[10px] font-bold text-gray-400">
                                            {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{comment.text}</p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No comments yet</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                                <input
                                  type="text"
                                  value={newComment[item.id] || ''}
                                  onChange={(e) => setNewComment({ ...newComment, [item.id]: e.target.value })}
                                  placeholder="Add a comment..."
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment(item.id)}
                                  className="flex-1 px-5 py-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700"
                                />
                                <button
                                  onClick={() => handleAddComment(item.id)}
                                  disabled={!newComment[item.id]?.trim()}
                                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                                >
                                  <Send className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex flex-row lg:flex-col items-center justify-between lg:justify-center lg:pl-8 lg:border-l border-gray-50 min-w-[120px] w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0">
                        <div className="flex flex-col items-center">
                          <button
                            onClick={() => handleVote(item.id, hasVoted)}
                            disabled={!isMember}
                            className={`w-16 h-16 rounded-[2rem] transition-all flex items-center justify-center ${
                              hasVoted 
                                ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-110' 
                                : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100'
                            } disabled:opacity-50`}
                          >
                            <ThumbsUp className={`w-7 h-7 ${hasVoted ? 'fill-white' : ''}`} />
                          </button>
                          <span className="mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {item.votes_count} votes
                          </span>
                        </div>
                        
                        {item.budget && (
                          <div className="lg:mt-8 flex flex-col items-center">
                            <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-2 border border-emerald-100">
                              <IndianRupee className="w-5 h-5 text-emerald-600" />
                            </div>
                            <span className="text-sm font-black text-emerald-700">{item.budget}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {initialItinerary && (
        <div className="mt-12 pt-12 border-t border-gray-100">
          <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100">
            <h4 className="text-sm font-bold text-amber-900 mb-4 uppercase tracking-widest flex items-center">
              <CalendarDays className="w-4 h-4 mr-2" />
              Organizer's Initial Vision
            </h4>
            <p className="text-amber-800 text-sm whitespace-pre-wrap leading-relaxed italic opacity-80">
              {typeof initialItinerary === 'string' ? initialItinerary : JSON.stringify(initialItinerary, null, 2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
