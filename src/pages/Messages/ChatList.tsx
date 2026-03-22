import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { MessageSquare, Search, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export const ChatList: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      try {
        // Fetch trips where user is an approved member
        const memberQ = query(collection(db, 'trip_members'), where('user_id', '==', user.uid), where('status', '==', 'approved'));
        const memberSnapshot = await getDocs(memberQ);
        const memberTripIds = memberSnapshot.docs.map(doc => doc.data().trip_id);

        // Fetch trips where user is the organizer
        const organizerQ = query(collection(db, 'trips'), where('organizer_id', '==', user.uid));
        const organizerSnapshot = await getDocs(organizerQ);
        const organizerTripIds = organizerSnapshot.docs.map(doc => doc.id);

        // Combine unique trip IDs
        const allTripIds = Array.from(new Set([...memberTripIds, ...organizerTripIds]));

        if (allTripIds.length > 0) {
          // Firestore 'in' query supports up to 10 items. For more, we'd need multiple queries.
          // For MVP, we'll take the first 10.
          const tripsQ = query(collection(db, 'trips'), where('__name__', 'in', allTripIds.slice(0, 10)));
          const tripsSnapshot = await getDocs(tripsQ);
          const tripsData = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setChats(tripsData);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Messages</h1>
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
            <MessageSquare className="text-indigo-600 w-5 h-5" />
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : chats.length > 0 ? (
            chats.map((chat) => (
              <motion.div
                key={chat.id}
                whileHover={{ x: 4 }}
                className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <Link to={`/messages/${chat.id}`} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <span className="text-indigo-600 font-bold text-xl">
                        {chat.destination_city.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{chat.destination_city} Group</h3>
                      <p className="text-sm text-gray-500 line-clamp-1">Tap to open group chat</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3 mr-1" />
                      Just now
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-gray-300 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No messages yet</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Join a trip or start a conversation with other travelers to see your messages here.
              </p>
              <Link to="/discover" className="mt-6 inline-block text-indigo-600 font-bold text-sm hover:underline">
                Discover Trips
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
