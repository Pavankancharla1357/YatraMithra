import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../Auth/AuthContext';
import { MessageSquare, User, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const MyChatHistory: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'channels'),
      where('participants', 'array-contains', user.uid),
      orderBy('last_message_time', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const channelData = await Promise.all(
        snapshot.docs.map(async (channelDoc) => {
          const data = channelDoc.data();
          let otherUser = null;

          if (data.type === 'direct') {
            const otherUserId = data.participants.find((id: string) => id !== user.uid);
            if (otherUserId) {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                otherUser = userDoc.data();
              }
            }
          }

          return {
            id: channelDoc.id,
            ...data,
            otherUser
          };
        })
      );
      setChannels(channelData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-400">Loading your chats...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-black text-gray-900">Recent Chats</h3>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
          {channels.length} Conversations
        </span>
      </div>

      {channels.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {channels.map((channel) => (
              <motion.div
                key={channel.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => navigate(`/messages/${channel.id}`)}
                className="bg-white p-6 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 flex items-center gap-6 cursor-pointer hover:border-indigo-100 hover:shadow-xl transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-50 flex items-center justify-center flex-shrink-0 shadow-inner border border-indigo-50/50">
                  {channel.type === 'direct' ? (
                    channel.otherUser?.photo_url ? (
                      <img 
                        src={channel.otherUser.photo_url} 
                        className="w-full h-full object-cover" 
                        alt={channel.otherUser.name} 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-8 h-8 text-indigo-300" />
                    )
                  ) : (
                    <Users className="w-8 h-8 text-indigo-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-black text-gray-900 truncate pr-4">
                      {channel.type === 'direct' ? channel.otherUser?.name : channel.name}
                    </h4>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0">
                      {formatTime(channel.last_message_time)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate font-medium group-hover:text-indigo-600 transition-colors">
                    {channel.last_message || 'No messages yet'}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-gray-200" />
          </div>
          <h4 className="text-lg font-black text-gray-900 mb-2">No Chats Yet</h4>
          <p className="text-gray-400 text-sm max-w-xs mx-auto font-medium">
            Start a conversation with travelers or join trip groups to see your chat history here.
          </p>
        </div>
      )}
    </div>
  );
};
