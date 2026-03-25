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
  CalendarDays
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

interface ItineraryPlannerProps {
  tripId: string;
  isMember: boolean;
  isOrganizer: boolean;
  initialItinerary?: string;
}

const ACTIVITY_TYPES = [
  { id: 'activity', label: 'Activity', icon: Camera, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'dining', label: 'Dining', icon: Utensils, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'transport', label: 'Transport', icon: Plane, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'lodging', label: 'Lodging', icon: Bed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-50' },
];

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({ tripId, isMember, isOrganizer, initialItinerary }) => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ title: '', location: '', time: '', day: 1, type: 'activity' });
  const [isAdding, setIsAdding] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

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
        created_by: user.uid,
        created_by_name: profile?.name || 'Member',
        votes: [],
        votes_count: 0,
        status: 'proposed',
        created_at: serverTimestamp()
      });
      setNewItem({ title: '', location: '', time: '', day: activeDay, type: 'activity' });
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

      {/* Day Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
              activeDay === day 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
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
            className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all"
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
            className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 shadow-inner"
          >
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Activity Title</label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="e.g., Sunrise at the Beach"
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Activity Type</label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITY_TYPES.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, type: type.id })}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          newItem.type === type.id 
                            ? 'bg-indigo-600 text-white border-indigo-600' 
                            : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={newItem.location}
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                      placeholder="Where is it?"
                      className="w-full pl-12 pr-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={newItem.time}
                      onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                      placeholder="e.g., 10:00 AM"
                      className="w-full pl-12 pr-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 text-gray-500 font-bold hover:text-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
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
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-100 -z-10" />
        )}

        <div className="space-y-6">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CalendarDays className="w-10 h-10 text-gray-200" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">No plans for Day {activeDay} yet</h4>
              <p className="text-gray-500 max-w-xs mx-auto mb-8">Start proposing activities to build your trip itinerary together.</p>
              {isMember && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all"
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
                  <div className={`mt-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-all ${
                    isConfirmed ? 'bg-indigo-600 scale-125' : 'bg-gray-300'
                  }`} />

                  <div className={`ml-8 flex-1 bg-white p-6 rounded-3xl border transition-all ${
                    isConfirmed 
                      ? 'border-indigo-100 shadow-xl shadow-indigo-50 ring-1 ring-indigo-50' 
                      : 'border-gray-100 shadow-lg shadow-gray-100/50 hover:border-indigo-100'
                  }`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center ${getTypeStyle(item.type)}`}>
                            {getTypeIcon(item.type)}
                            <span className="ml-1.5">{item.type}</span>
                          </span>
                          {isConfirmed && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center">
                              <Check className="w-3 h-3 mr-1" />
                              Confirmed
                            </span>
                          )}
                          {item.votes_count >= 3 && !isConfirmed && (
                            <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center">
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              Popular
                            </span>
                          )}
                        </div>
                        
                        <h4 className={`text-xl font-bold text-gray-900 mb-2 ${isConfirmed ? 'text-indigo-900' : ''}`}>
                          {item.title}
                        </h4>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                          {item.time && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                              {item.time}
                            </div>
                          )}
                          {item.location && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                              {item.location}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-2 text-[10px] font-bold text-gray-500">
                              {item.created_by_name?.charAt(0)}
                            </div>
                            <span className="text-xs text-gray-400 font-medium">Proposed by {item.created_by_name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {isOrganizer && (
                              <button
                                onClick={() => handleConfirm(item.id, item.status)}
                                className={`p-2 rounded-xl transition-all ${
                                  isConfirmed 
                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                    : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'
                                }`}
                                title={isConfirmed ? "Unconfirm Activity" : "Confirm Activity"}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                            )}
                            {(isCreator || isOrganizer) && (
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-all"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center sm:pl-6 sm:border-l border-gray-50 min-w-[80px]">
                        <button
                          onClick={() => handleVote(item.id, hasVoted)}
                          disabled={!isMember}
                          className={`w-14 h-14 rounded-2xl transition-all flex items-center justify-center ${
                            hasVoted 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110' 
                              : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'
                          } disabled:opacity-50`}
                        >
                          <ThumbsUp className={`w-6 h-6 ${hasVoted ? 'fill-white' : ''}`} />
                        </button>
                        <span className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {item.votes_count} votes
                        </span>
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
              "{initialItinerary}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
