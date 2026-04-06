import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, getDoc, doc, onSnapshot, limit, getCountFromServer, setDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { MessageSquare, Search, ChevronRight, Clock, Users, Pin, BellOff, Archive, Trash2, MoreVertical, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const ChatList: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadChatIds, setUnreadChatIds] = useState<Record<string, number>>({});
  const [pinnedChatIds, setPinnedChatIds] = useState<Set<string>>(new Set());
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(new Set());
  const [archivedChatIds, setArchivedChatIds] = useState<Set<string>>(new Set());
  const [deletedChatIds, setDeletedChatIds] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Map<string, { is_online: boolean; last_seen: string }>>(new Map());

  useEffect(() => {
    if (!user) return;

    // 1. Listen for unread message notifications
    // We simplify the query to avoid potential index issues and filter in-memory
    const unreadQ = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      where('type', '==', 'new_message'),
      where('is_read', '==', false)
    );

    const unsubscribeUnread = onSnapshot(unreadQ, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Count any unread notification that links to a chat
        const link = data.link;
        if (link && link.startsWith('/messages/')) {
          const chatId = link.split('/').pop();
          if (chatId) {
            counts[chatId] = (counts[chatId] || 0) + 1;
          }
        }
      });
      setUnreadChatIds(counts);
    }, (error) => {
      console.error('Error listening for unread notifications:', error);
    });

    // 2. Listen for user chat settings (pinned, muted, archived, deleted)
    const settingsQ = collection(db, 'users', user.uid, 'chat_settings');
    const unsubscribeSettings = onSnapshot(settingsQ, (snapshot) => {
      const pinned = new Set<string>();
      const muted = new Set<string>();
      const archived = new Set<string>();
      const deleted = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.pinned) pinned.add(doc.id);
        if (data.muted) muted.add(doc.id);
        if (data.archived) archived.add(doc.id);
        if (data.deleted) deleted.add(doc.id);
      });
      
      setPinnedChatIds(pinned);
      setMutedChatIds(muted);
      setArchivedChatIds(archived);
      setDeletedChatIds(deleted);
    });

    // 3. Real-time listener for trip-based chats
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
      
      const allTripIds = Array.from(new Set([...tripIds, ...organizerTripIds])).filter(id => id && typeof id === 'string');

      if (unsubscribeTripsData) unsubscribeTripsData();

      if (allTripIds.length === 0) {
        setChats(prev => prev.filter(c => c.type !== 'group'));
        return;
      }

      const tripsQ = query(collection(db, 'trips'), where('__name__', 'in', allTripIds.slice(0, 10)));
      unsubscribeTripsData = onSnapshot(tripsQ, async (tripsSnapshot) => {
        const tripChatsPromises = tripsSnapshot.docs.map(async (docSnap) => {
          try {
            const data = docSnap.data();
            
            // Fetch member count and some photos for stacked avatars
            const membersQ = query(collection(db, 'trip_members'), where('trip_id', '==', docSnap.id), limit(3));
            const membersSnapshot = await getDocs(membersQ);
            const memberCountSnapshot = await getCountFromServer(query(collection(db, 'trip_members'), where('trip_id', '==', docSnap.id)));
            const memberCount = memberCountSnapshot.data().count;

            const memberPhotosPromises = membersSnapshot.docs.map(async (mDoc) => {
              try {
                const uDoc = await getDoc(doc(db, 'users', mDoc.data().user_id));
                return uDoc.data()?.photo_url;
              } catch (e) {
                return null;
              }
            });
            const memberPhotos = (await Promise.all(memberPhotosPromises)).filter(Boolean);

            // Fetch last message from messages collection
            const lastMsgQ = query(
              collection(db, 'messages'),
              where('channel_id', '==', docSnap.id),
              orderBy('created_at', 'desc'),
              limit(1)
            );
            const lastMsgSnapshot = await getDocs(lastMsgQ);
            const lastMsgData = lastMsgSnapshot.docs[0]?.data();

            return {
              id: docSnap.id,
              type: 'group' as const,
              name: `${data.destination_city} Group`,
              lastMessage: lastMsgData ? `${lastMsgData.sender_name}: ${lastMsgData.content}` : 'Tap to open group chat',
              icon: data.destination_city?.charAt(0) || 'T',
              memberCount,
              memberPhotos,
              ...data,
              lastMessageTime: lastMsgData?.created_at || data.last_message_time || data.updated_at || data.created_at
            };
          } catch (error) {
            console.error('Error fetching trip chat:', docSnap.id, error);
            return null;
          }
        });

        const tripChats = (await Promise.all(tripChatsPromises)).filter(Boolean);
        
        setChats(prev => {
          const others = prev.filter(c => c.type !== 'group');
          const combined = [...others, ...tripChats].sort((a, b) => {
            const getTimestamp = (t: any) => {
              if (!t) return 0;
              if (t.seconds) return t.seconds * 1000;
              if (t instanceof Date) return t.getTime();
              return new Date(t).getTime() || 0;
            };
            return getTimestamp(b.lastMessageTime) - getTimestamp(a.lastMessageTime);
          });
          return combined;
        });
        setLoading(false);
      }, (error) => {
        console.error('Error in trips snapshot:', error);
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
        try {
          const data = docSnapshot.data();
          let name = 'Direct Message';
          let icon = 'DM';
          let photoUrl = null;
          let otherUserId = null;
          let otherUserInfo = null;

          let isConnected = true;

          if (data.type === 'direct') {
            otherUserId = data.participants.find((id: string) => id !== user.uid);
            if (otherUserId) {
              const userDoc = await getDoc(doc(db, 'users', otherUserId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                name = userData.name || 'Traveler';
                icon = name.charAt(0);
                photoUrl = userData.photo_url;
                otherUserInfo = {
                  is_online: userData.is_online,
                  last_seen: userData.last_seen
                };
              }

              // Check connection status
              const connId = [user.uid, otherUserId].sort().join('_');
              const connDoc = await getDoc(doc(db, 'connections', connId));
              isConnected = connDoc.exists() && connDoc.data().status === 'accepted';
            }
          }

          return {
            id: docSnapshot.id,
            type: data.type,
            name,
            lastMessage: (data.type === 'direct' && !isConnected) ? 'Connect to view messages' : (data.last_message || 'No messages yet'),
            lastMessageTime: data.last_message_time || data.updated_at,
            participants: data.participants,
            icon,
            photoUrl,
            otherUserId,
            otherUserInfo,
            isConnected
          };
        } catch (error) {
          console.error('Error fetching direct chat:', docSnapshot.id, error);
          return null;
        }
      });

      const directChats = (await Promise.all(directChatsPromises)).filter(Boolean);
      
      // Update online users state
      const onlineMap = new Map();
      directChats.forEach(chat => {
        if (chat && chat.otherUserId && chat.otherUserInfo) {
          onlineMap.set(chat.otherUserId, chat.otherUserInfo);
        }
      });
      setOnlineUsers(onlineMap);

      setChats(prev => {
        const others = prev.filter(c => c.type === 'group');
        const combined = [...others, ...directChats].sort((a, b) => {
          const getTimestamp = (t: any) => {
            if (!t) return 0;
            if (t.seconds) return t.seconds * 1000;
            if (t instanceof Date) return t.getTime();
            return new Date(t).getTime() || 0;
          };
          return getTimestamp(b.lastMessageTime) - getTimestamp(a.lastMessageTime);
        });
        return combined;
      });
      setLoading(false);
    });

    return () => {
      unsubscribeUnread();
      unsubscribeSettings();
      unsubscribeTripMembers();
      if (unsubscribeTripsData) unsubscribeTripsData();
      unsubscribeChannels();
    };
  }, [user]);

  const filteredChats = chats.filter(chat => 
    !deletedChatIds.has(chat.id) &&
    !archivedChatIds.has(chat.id) &&
    ((chat.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (chat.lastMessage?.toLowerCase() || '').includes(searchQuery.toLowerCase()))
  );

  const pinnedChats = filteredChats.filter(chat => pinnedChatIds.has(chat.id));
  const regularChats = filteredChats.filter(chat => !pinnedChatIds.has(chat.id));

  const togglePin = async (chatId: string) => {
    if (!user) return;
    try {
      const isPinned = pinnedChatIds.has(chatId);
      await setDoc(doc(db, 'users', user.uid, 'chat_settings', chatId), { 
        pinned: !isPinned 
      }, { merge: true });
      toast.success(isPinned ? 'Chat unpinned' : 'Chat pinned');
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };

  const toggleMute = async (chatId: string) => {
    if (!user) return;
    try {
      const isMuted = mutedChatIds.has(chatId);
      await setDoc(doc(db, 'users', user.uid, 'chat_settings', chatId), { 
        muted: !isMuted 
      }, { merge: true });
      toast.success(isMuted ? 'Chat unmuted' : 'Chat muted');
    } catch (error) {
      toast.error('Failed to update mute status');
    }
  };

  const toggleArchive = async (chatId: string) => {
    if (!user) return;
    try {
      const isArchived = archivedChatIds.has(chatId);
      await setDoc(doc(db, 'users', user.uid, 'chat_settings', chatId), { 
        archived: !isArchived 
      }, { merge: true });
      toast.success(isArchived ? 'Chat unarchived' : 'Chat archived');
    } catch (error) {
      toast.error('Failed to archive chat');
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this chat? This will remove it from your list.')) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'chat_settings', chatId), { 
        deleted: true,
        deleted_at: new Date().toISOString()
      }, { merge: true });
      toast.success('Chat deleted');
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-amber-100 text-amber-900 rounded-sm px-0.5">{part}</span> 
        : part
    );
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return null;
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      if (isNaN(date.getTime())) return null;
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
            <MessageSquare className="text-purple-600 w-5 h-5" />
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm transition-all"
          />
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : filteredChats.length > 0 ? (
            <>
              {pinnedChats.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 px-2">
                    <Pin className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pinned Chats</span>
                  </div>
                  {pinnedChats.map((chat) => (
                    <ChatItem 
                      key={chat.id} 
                      chat={chat} 
                      isUnread={!!unreadChatIds[chat.id]}
                      unreadCount={unreadChatIds[chat.id]}
                      isPinned={true}
                      isMuted={mutedChatIds.has(chat.id)}
                      onPin={() => togglePin(chat.id)}
                      onMute={() => toggleMute(chat.id)}
                      onArchive={() => toggleArchive(chat.id)}
                      onDelete={() => deleteChat(chat.id)}
                      highlightText={highlightText}
                      searchQuery={searchQuery}
                      formatTime={formatTime}
                      onlineUsers={onlineUsers}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {pinnedChats.length > 0 && (
                  <div className="flex items-center space-x-2 px-2 pt-4">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">All Messages</span>
                  </div>
                )}
                {regularChats.map((chat) => (
                  <ChatItem 
                    key={chat.id} 
                    chat={chat} 
                    isUnread={!!unreadChatIds[chat.id]}
                    unreadCount={unreadChatIds[chat.id]}
                    isPinned={false}
                    isMuted={mutedChatIds.has(chat.id)}
                    onPin={() => togglePin(chat.id)}
                    onMute={() => toggleMute(chat.id)}
                    onArchive={() => toggleArchive(chat.id)}
                    onDelete={() => deleteChat(chat.id)}
                    highlightText={highlightText}
                    searchQuery={searchQuery}
                    formatTime={formatTime}
                    onlineUsers={onlineUsers}
                  />
                ))}
              </div>
            </>
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

interface ChatItemProps {
  chat: any;
  isUnread: boolean;
  unreadCount?: number;
  isPinned: boolean;
  isMuted: boolean;
  onPin: () => void;
  onMute: () => void;
  onArchive: () => void;
  onDelete: () => void;
  highlightText: (text: string, query: string) => React.ReactNode;
  searchQuery: string;
  formatTime: (timestamp: any) => string | null;
  onlineUsers: Map<string, { is_online: boolean; last_seen: string }>;
}

const ChatItem: React.FC<ChatItemProps> = ({ 
  chat, 
  isUnread, 
  unreadCount, 
  isPinned, 
  isMuted,
  onPin, 
  onMute,
  onArchive,
  onDelete,
  highlightText, 
  searchQuery, 
  formatTime,
  onlineUsers
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const otherUserStatus = chat.otherUserId ? onlineUsers.get(chat.otherUserId) : null;
  const isOnline = otherUserStatus?.is_online;

  const formatLastSeen = (lastSeen: string) => {
    if (!lastSeen) return '';
    try {
      const date = new Date(lastSeen);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (date.toDateString() === now.toDateString()) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`group bg-white rounded-3xl border transition-all relative overflow-hidden ${
        isUnread ? 'border-purple-100 shadow-sm' : 'border-gray-100'
      } hover:shadow-md hover:border-purple-200 cursor-pointer`}
    >
      <div className="flex items-stretch">
        {/* Avatar Section */}
        <div className="p-4 pr-0 relative flex items-center justify-center w-20">
          {chat.type === 'direct' && chat.otherUserId ? (
            <Link 
              to={`/profile/${chat.otherUserId}`}
              className="block w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center relative overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
            >
              {chat.photoUrl ? (
                <img src={chat.photoUrl} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-purple-600 font-bold text-xl">{chat.icon}</span>
              )}
              {/* Online Indicator */}
              <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 border-2 border-white rounded-full shadow-sm ${isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            </Link>
          ) : (
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center relative group-hover:bg-purple-100 transition-colors">
              {chat.type === 'group' ? (
                <div className="relative flex items-center justify-center w-full h-full">
                  {chat.memberPhotos && chat.memberPhotos.length > 0 ? (
                    <div className="flex -space-x-5">
                      {chat.memberPhotos.slice(0, 3).map((photo: string, i: number) => (
                        <img 
                          key={i} 
                          src={photo} 
                          className="w-9 h-9 rounded-xl border-2 border-white object-cover shadow-sm" 
                          style={{ zIndex: 3 - i }}
                          referrerPolicy="no-referrer"
                        />
                      ))}
                      {chat.memberCount > 3 && (
                        <div className="w-9 h-9 rounded-xl border-2 border-white bg-purple-600 flex items-center justify-center text-[8px] font-black text-white shadow-sm z-0">
                          +{chat.memberCount - 3}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Users className="w-6 h-6 text-purple-600" />
                  )}
                </div>
              ) : (
                <span className="text-purple-600 font-bold text-xl">{chat.icon}</span>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        <Link to={`/messages/${chat.id}`} className="flex-1 p-4 flex items-center justify-between min-w-0">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center space-x-2 mb-0.5">
              <h3 className={`truncate ${isUnread ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                {highlightText(chat.name, searchQuery)}
              </h3>
              {chat.type === 'group' && (
                <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                  <Users className="w-2 h-2" />
                  <span>{chat.memberCount} members</span>
                </div>
              )}
              {isPinned && <Pin className="w-3 h-3 text-purple-400 fill-purple-400" />}
              {isMuted && <BellOff className="w-3 h-3 text-gray-300" />}
            </div>
            <div className="flex flex-col">
              {chat.type === 'direct' && !chat.isConnected ? (
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <div className="px-1.5 py-0.5 bg-amber-50 rounded text-[8px] font-black text-amber-600 uppercase tracking-widest border border-amber-100 flex items-center">
                    <Zap className="w-2 h-2 mr-1 fill-amber-600" />
                    Pending
                  </div>
                  <p className="text-xs text-amber-500/70 font-medium truncate">
                    Connect to start chatting
                  </p>
                </div>
              ) : (
                <p className={`text-sm line-clamp-1 break-all ${isUnread ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                  {highlightText(chat.lastMessage, searchQuery)}
                </p>
              )}
              {chat.type === 'direct' && !isOnline && otherUserStatus?.last_seen && (
                <span className="text-[9px] text-gray-300 font-medium mt-0.5">
                  Last seen: {formatLastSeen(otherUserStatus.last_seen)}
                </span>
              )}
            </div>
          </div>

          {/* Metadata Section */}
          <div className="flex flex-col items-end justify-between py-1">
            <div className="flex items-center text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-purple-400 transition-colors">
              {formatTime(chat.lastMessageTime)}
            </div>
            
            <AnimatePresence mode="wait">
              {isHovered ? (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center space-x-1"
                  onClick={(e) => e.preventDefault()}
                >
                  <button 
                    onClick={(e) => { e.preventDefault(); onPin(); }}
                    className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); onMute(); }}
                    className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    <BellOff className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); onArchive(); }}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); onDelete(); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center space-x-2"
                >
                  {unreadCount && unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-black text-white shadow-sm shadow-purple-200">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Link>
      </div>
    </motion.div>
  );
};
