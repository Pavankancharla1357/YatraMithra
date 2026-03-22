import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { createNotification } from '../../services/notificationService';
import { X, Send, Info, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JoinRequestModalProps {
  trip: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinRequestModal: React.FC<JoinRequestModalProps> = ({ trip, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isRestricted = trip.is_women_only && profile?.gender !== 'female';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isRestricted) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'trip_members'), {
        trip_id: trip.id,
        user_id: user.uid,
        user_name: profile?.name || user.displayName || 'Traveler',
        trip_name: trip.destination_city,
        role: 'member',
        status: 'pending',
        request_message: message.trim(),
        joined_at: serverTimestamp(),
      });

      // Create notification for organizer
      await createNotification(
        trip.organizer_id,
        'request_received',
        'New Join Request',
        `${profile?.name || user.displayName || 'A traveler'} wants to join your trip to ${trip.destination_city}.`,
        `/dashboard`
      );

      onSuccess();
    } catch (error) {
      console.error('Error sending join request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Request to Join</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isRestricted ? (
            <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100 text-center">
              <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-pink-900 mb-2">Women Only Trip</h4>
              <p className="text-sm text-pink-700 leading-relaxed">
                This trip is exclusively for female travelers. To join, please ensure your profile gender is set to 'Female'.
              </p>
              <button 
                type="button"
                onClick={() => navigate('/profile')}
                className="mt-6 w-full py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-all"
              >
                Update Profile
              </button>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 p-4 rounded-2xl flex items-start space-x-3">
                <Info className="w-5 h-5 text-indigo-600 mt-0.5" />
                <p className="text-sm text-indigo-700 leading-relaxed">
                  Introduce yourself to the organizer! Mention why you're interested in this trip and your travel experience.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message to Organizer</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Hi! I'm an avid hiker and would love to join your Tokyo adventure..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Sending...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Send Request
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
};
