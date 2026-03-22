import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ThumbsUp, MapPin, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

interface ItineraryPlannerProps {
  tripId: string;
  isMember: boolean;
}

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({ tripId, isMember }) => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ title: '', location: '', time: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `trips/${tripId}/itinerary`), orderBy('votes_count', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [tripId]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItem.title.trim()) return;

    try {
      await addDoc(collection(db, `trips/${tripId}/itinerary`), {
        title: newItem.title.trim(),
        location: newItem.location.trim(),
        time: newItem.time.trim(),
        created_by: user.uid,
        created_by_name: profile?.name || 'Member',
        votes: [],
        votes_count: 0,
        status: 'proposed',
        created_at: serverTimestamp()
      });
      setNewItem({ title: '', location: '', time: '' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trips/${tripId}/itinerary`);
    }
  };

  const handleVote = async (itemId: string, hasVoted: boolean) => {
    if (!user) return;
    const itemRef = doc(db, `trips/${tripId}/itinerary`, itemId);
    const item = items.find(i => i.id === itemId);
    
    try {
      await updateDoc(itemRef, {
        votes: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid),
        votes_count: hasVoted ? (item.votes_count - 1) : (item.votes_count + 1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/itinerary/${itemId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900">Collaborative Itinerary</h3>
        {isMember && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Propose Activity</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddItem} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Activity Title (e.g., Sunrise Hike)"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  placeholder="Location"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input
                  type="text"
                  value={newItem.time}
                  onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                  placeholder="Time/Day"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  Add to List
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No activities proposed yet.</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to suggest something fun!</p>
          </div>
        ) : (
          items.map((item) => {
            const hasVoted = item.votes?.includes(user?.uid);
            return (
              <motion.div
                key={item.id}
                layout
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                    {item.votes_count >= 3 && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                    {item.location && (
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-indigo-500" />
                        {item.location}
                      </span>
                    )}
                    {item.time && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-indigo-500" />
                        {item.time}
                      </span>
                    )}
                    <span className="text-gray-300">|</span>
                    <span>Proposed by {item.created_by_name}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 ml-6">
                  <div className="text-center">
                    <button
                      onClick={() => handleVote(item.id, hasVoted)}
                      disabled={!isMember}
                      className={`p-3 rounded-xl transition-all ${
                        hasVoted 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      } disabled:opacity-50`}
                    >
                      <ThumbsUp className={`w-5 h-5 ${hasVoted ? 'fill-white' : ''}`} />
                    </button>
                    <span className="block text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                      {item.votes_count} votes
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
