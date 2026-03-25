import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { MessageItem } from '../../components/Chat/MessageItem';
import { ChatInput } from '../../components/Chat/ChatInput';
import { PollCreator } from '../../components/Chat/PollCreator';
import { ChevronLeft, Info, Phone, Video, MoreVertical, Sparkles, Calendar, BarChart2 } from 'lucide-react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export const ChatRoom: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!channelId || !user) return;

    // Mark notifications for this channel as read
    const markNotificationsAsRead = async () => {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('user_id', '==', user.uid),
          where('type', '==', 'new_message'),
          where('is_read', '==', false),
          where('link', '==', `/messages/${channelId}`)
        );
        const snapshot = await getDocs(q);
        const updatePromises = snapshot.docs.map(d => updateDoc(d.ref, { is_read: true }));
        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    };

    markNotificationsAsRead();
  }, [channelId, user]);

  const icebreakers = [
    "What is the one thing you can't travel without?",
    "What's the most adventurous thing you've ever done?",
    "Street food or fine dining? Why?",
    "What's your favorite travel memory so far?",
    "If you could travel anywhere in the world tomorrow, where would it be?",
    "What's the weirdest thing you've ever eaten while traveling?",
  ];

  const sendIcebreaker = async () => {
    if (!channelId || !user) return;
    const randomIcebreaker = icebreakers[Math.floor(Math.random() * icebreakers.length)];
    try {
      await addDoc(collection(db, 'messages'), {
        channel_id: channelId,
        sender_id: 'system',
        sender_name: 'WanderMatch Bot',
        content: `🧊 ICEBREAKER: ${randomIcebreaker}`,
        message_type: 'system',
        created_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending icebreaker:', error);
    }
  };

  const scheduleMeetup = async () => {
    if (!channelId || !user) return;
    try {
      await addDoc(collection(db, 'messages'), {
        channel_id: channelId,
        sender_id: 'system',
        sender_name: 'WanderMatch Bot',
        content: `📅 MEETUP PROPOSAL: Let's schedule a quick video call to get to know each other! How about this weekend?`,
        message_type: 'system',
        created_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error scheduling meetup:', error);
    }
  };

  useEffect(() => {
    if (!channelId) return;

    // Fetch channel info (could be a trip or a DM)
    const fetchChannelInfo = async () => {
      try {
        // Try trip first
        const tripDoc = await getDoc(doc(db, 'trips', channelId));
        if (tripDoc.exists()) {
          setChannelInfo({ ...tripDoc.data(), type: 'group' });
          return;
        }

        // Handle DM case
        const channelDoc = await getDoc(doc(db, 'channels', channelId));
        if (channelDoc.exists()) {
          const channelData = channelDoc.data();
          if (channelData.type === 'direct') {
            const otherUserId = channelData.participants.find((id: string) => id !== user?.uid);
            if (otherUserId) {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                setChannelInfo({
                  name: userDoc.data().name || 'Traveler',
                  type: 'direct',
                  otherUserId: otherUserId,
                  photoUrl: userDoc.data().photo_url
                });
                return;
              }
            }
          }
          setChannelInfo({ name: 'Direct Message', type: 'direct' });
        }
      } catch (error) {
        console.error('Error fetching channel info:', error);
      }
    };

    fetchChannelInfo();

    const q = query(
      collection(db, 'messages'),
      where('channel_id', '==', channelId),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (error) => {
      console.error('Error in messages snapshot:', error);
      // Fallback: try without orderBy if it's an index issue
      if (error.message.includes('index')) {
        const fallbackQ = query(
          collection(db, 'messages'),
          where('channel_id', '==', channelId)
        );
        onSnapshot(fallbackQ, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort manually if needed
          msgs.sort((a: any, b: any) => (a.created_at?.seconds || 0) - (b.created_at?.seconds || 0));
          setMessages(msgs);
        });
      }
    });

    return () => unsubscribe();
  }, [channelId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!channelId) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div 
            className={`flex items-center space-x-3 ${channelInfo?.type === 'direct' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={() => {
              if (channelInfo?.type === 'direct' && channelInfo?.otherUserId) {
                navigate(`/profile/${channelInfo.otherUserId}`);
              }
            }}
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden">
              {channelInfo?.photoUrl ? (
                <img src={channelInfo.photoUrl} alt={channelInfo.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-indigo-600 font-bold">
                  {channelInfo?.destination_city?.charAt(0) || channelInfo?.name?.charAt(0) || 'C'}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-none">
                {channelInfo?.destination_city ? `${channelInfo.destination_city} Group` : (channelInfo?.name || 'Chat')}
              </h3>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={sendIcebreaker}
            className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
            title="Send Icebreaker"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button 
            onClick={scheduleMeetup}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            title="Schedule Meetup"
          >
            <Calendar className="w-5 h-5" />
          </button>
          {channelInfo?.type === 'group' && (
            <button 
              onClick={() => setShowPollCreator(true)}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Create Poll"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          )}
          <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth"
      >
        <div className="text-center py-8">
          <div className="inline-block px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
            {channelInfo?.type === 'group' ? 'Trip Created' : 'Chat Started'}
          </div>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            {channelInfo?.type === 'group' 
              ? `This is the beginning of your group chat for the trip to ${channelInfo?.destination_city}.`
              : `This is the beginning of your conversation with ${channelInfo?.name || 'your travel buddy'}.`}
          </p>
        </div>
        
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input Area */}
      <ChatInput channelId={channelId} />

      {/* Poll Creator Modal */}
      <AnimatePresence>
        {showPollCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <PollCreator 
              channelId={channelId} 
              onClose={() => setShowPollCreator(false)} 
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
