import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, getDoc, doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { MessageSquare, Search, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export const ChatList: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // 1. Listen for unread message notifications
    const unreadQ = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      where('type', '==', 'new_message'),
      where('is_read', '==', false)
    );

    const unsubscribeUnread = onSnapshot(unreadQ, (snapshot) => {
      const ids = new Set<string>();
      snapshot.docs.forEach(doc => {
        const link = doc.data().link;
        if (link && link.startsWith('/messages/')) {
          const chatId = link.split('/').pop();
          if (chatId) ids.add(chatId);
        }
      });
      setUnreadChatIds(ids);
    });

    // 2. Real-time listener for trip-based chats
    const tripMembersQuery = query(
      collection(db, 'trip_members'),
      where('user_id', '==', user.uid),
      where('status', '==', 'approved')
    );

    let unsubscribeTripsData: (() => void) | null = null;

    const unsubscribeTripMembers = onSnapshot(tripMembersQuery, async (snapshot) => {
      const tripIds = snapshot.docs.map(doc => doc.data().trip_id);
      
      // Also check for trips where user is organizer
      const organizerQ = query(collection(db, 'trips'), where('organizer_id', '==', user.uid));
      const organizerSnapshot = await getDocs(organizerQ);
      const organizerTripIds = organizerSnapshot.docs.map(doc => doc.id);
      
      const allTripIds = Array.from(new Set([...tripIds, ...organizerTripIds]));

      if (unsubscribeTripsData) unsubscribeTripsData();

      if (allTripIds.length === 0) {
        setChats(prev => prev.filter(c => c.type !== 'group'));
        return;
      }

      const tripsQ = query(collection(db, 'trips'), where('__name__', 'in', allTripIds.slice(0, 10)));
      unsubscribeTripsData = onSnapshot(tripsQ, (tripsSnapshot) => {
        const tripChats = tripsSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'group' as const,
          name: `${doc.data().destination_city} Group`,
          lastMessage: 'Tap to open group chat',
          icon: doc.data().destination_city?.charAt(0) || 'T',
          ...doc.data(),
          lastMessageTime: doc.data().last_message_time || doc.data().updated_at || doc.data().created_at
        }));
        
        setChats(prev => {
          const others = prev.filter(c => c.type !== 'group');
          const combined = [...others, ...tripChats].sort((a, b) => {
            const timeA = a.lastMessageTime?.seconds || 0;
            const timeB = b.lastMessageTime?.seconds || 0;
            return timeB - timeA;
          });
          return combined;
        });
        setLoading(false);
      });
    });

    // 3. Real-time listener for direct message channels
    const channelsQ = query(
      collection(db, 'channels'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribeChannels = onSnapshot(channelsQ, async (snapshot) => {
      const directChatsPromises = snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        let name = 'Direct Message';
        let icon = 'DM';
        let photoUrl = null;
        let otherUserId = null;

        if (data.type === 'direct') {
          otherUserId = data.participants.find((id: string) => id !== user.uid);
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              name = userData.name || 'Traveler';
              icon = name.charAt(0);
              photoUrl = userData.photo_url;
            }
          }
        }

        return {
          id: docSnapshot.id,
          type: data.type,
          name,
          lastMessage: data.last_message || 'No messages yet',
          lastMessageTime: data.last_message_time || data.updated_at,
          participants: data.participants,
          icon,
          photoUrl,
          otherUserId
        };
      });

      const directChats = await Promise.all(directChatsPromises);
      
      setChats(prev => {
        const others = prev.filter(c => c.type === 'group');
        const combined = [...others, ...directChats].sort((a, b) => {
          const timeA = a.lastMessageTime?.seconds || 0;
          const timeB = b.lastMessageTime?.seconds || 0;
          return timeB - timeA;
        });
        return combined;
      });
      setLoading(false);
    });

    return () => {
      unsubscribeUnread();
      unsubscribeTripMembers();
      if (unsubscribeTripsData) unsubscribeTripsData();
      unsubscribeChannels();
    };
  }, [user]);

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: any) => {
    if (!timestamp) return null;
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return null;
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (e) {
      return null;
    }
  };

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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <motion.div
                key={chat.id}
                whileHover={{ x: 4 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* Avatar/Profile Link */}
                  <div className="p-4 pr-0">
                    {chat.type === 'direct' && chat.otherUserId ? (
                      <Link 
                        to={`/profile/${chat.otherUserId}`}
                        className="block w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center relative overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all"
                      >
                        {chat.photoUrl ? (
                          <img src={chat.photoUrl} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-indigo-600 font-bold text-xl">{chat.icon}</span>
                        )}
                        {unreadChatIds.has(chat.id) && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                        )}
                      </Link>
                    ) : (
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center relative">
                        <span className="text-indigo-600 font-bold text-xl">{chat.icon}</span>
                        {unreadChatIds.has(chat.id) && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chat Link */}
                  <Link to={`/messages/${chat.id}`} className="flex-1 p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {chat.name}
                      </h3>
                      <p className={`text-sm line-clamp-1 ${unreadChatIds.has(chat.id) ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                        {chat.lastMessage}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {formatTime(chat.lastMessageTime) && (
                        <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(chat.lastMessageTime)}
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </Link>
                </div>
              </motion.div>
            ))
          ) : searchQuery ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-300 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No conversations found</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                We couldn't find any messages matching "{searchQuery}".
              </p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 text-indigo-600 font-bold text-sm hover:underline"
              >
                Clear search
              </button>
            </div>
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
