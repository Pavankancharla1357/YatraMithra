import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Send, User, Sparkles, Megaphone } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

export const TravelFeed: React.FC = () => {
  const { user, profile } = useAuth();
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [newShoutout, setNewShoutout] = useState({
    content: '',
    location: '',
    dates: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'shoutouts'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setShoutouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newShoutout.content.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'shoutouts'), {
        user_id: user.uid,
        user_name: profile?.name || user.displayName || 'Traveler',
        content: newShoutout.content.trim(),
        location: newShoutout.location.trim(),
        dates: newShoutout.dates.trim(),
        created_at: serverTimestamp()
      });
      setNewShoutout({ content: '', location: '', dates: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'shoutouts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-block p-3 bg-indigo-100 rounded-3xl mb-4">
            <Megaphone className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Travel Shoutouts</h1>
          <p className="mt-2 text-lg text-gray-500">Looking for a travel buddy? Post it here!</p>
        </div>

        {/* Post Form */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100/50 border border-gray-100 mb-12">
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={newShoutout.content}
              onChange={(e) => setNewShoutout({ ...newShoutout, content: e.target.value })}
              placeholder="Where do you want to go? What's the plan?"
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[120px]"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={newShoutout.location}
                  onChange={(e) => setNewShoutout({ ...newShoutout, location: e.target.value })}
                  placeholder="Location (optional)"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={newShoutout.dates}
                  onChange={(e) => setNewShoutout({ ...newShoutout, dates: e.target.value })}
                  placeholder="Dates (optional)"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !newShoutout.content.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Post Shoutout</span>
            </button>
          </form>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          <AnimatePresence>
            {shoutouts.map((shoutout) => (
              <motion.div
                key={shoutout.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/50 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-none">{shoutout.user_name}</h4>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {shoutout.created_at?.toDate ? new Date(shoutout.created_at.toDate()).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-all">
                    Message
                  </button>
                </div>
                
                <p className="text-gray-700 leading-relaxed mb-6 font-medium">
                  {shoutout.content}
                </p>

                <div className="flex flex-wrap gap-4">
                  {shoutout.location && (
                    <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                      <MapPin className="w-3 h-3 mr-1.5 text-indigo-500" />
                      {shoutout.location}
                    </div>
                  )}
                  {shoutout.dates && (
                    <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                      <Calendar className="w-3 h-3 mr-1.5 text-indigo-500" />
                      {shoutout.dates}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
