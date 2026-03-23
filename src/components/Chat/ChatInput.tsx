import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { createNotification } from '../../services/notificationService';
import { Send, Image, Paperclip, Smile } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface ChatInputProps {
  channelId: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ channelId }) => {
  const { user, profile } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    setSending(true);
    setShowEmojiPicker(false);
    try {
      const senderName = profile?.name || user.displayName || 'Traveler';
      const senderVerified = profile?.is_verified || false;
      await addDoc(collection(db, 'messages'), {
        channel_id: channelId,
        sender_id: user.uid,
        sender_name: senderName,
        sender_verified: senderVerified,
        content: message.trim(),
        message_type: 'text',
        created_at: serverTimestamp(),
      });

      // Update channel last message (for both trips and direct channels)
      try {
        const channelRef = doc(db, 'channels', channelId);
        const channelSnap = await getDoc(channelRef);
        if (channelSnap.exists()) {
          await updateDoc(channelRef, {
            last_message: message.trim(),
            last_message_time: serverTimestamp()
          });
        } else {
          // If it's a trip group chat, we might want to update the trip doc too, 
          // but for now let's just ensure direct channels work.
          // Actually, let's check if it's a trip
          const tripRef = doc(db, 'trips', channelId);
          const tripSnap = await getDoc(tripRef);
          if (tripSnap.exists()) {
            await updateDoc(tripRef, {
              last_message: message.trim(),
              last_message_time: serverTimestamp()
            });
          }
        }
      } catch (e) {
        console.error('Error updating channel metadata:', e);
      }

      // Notify other members
      const tripRef = doc(db, 'trips', channelId);
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        
        // Fetch approved members
        const membersQ = query(
          collection(db, 'trip_members'),
          where('trip_id', '==', channelId),
          where('status', '==', 'approved')
        );
        const membersSnap = await getDocs(membersQ);
        
        const notificationPromises = membersSnap.docs
          .map(doc => doc.data().user_id)
          .filter(uid => uid !== user.uid)
          .map(uid => createNotification(
            uid,
            'new_message',
            `New message in ${tripData.destination_city}`,
            `${senderName} sent a message: ${message.trim().substring(0, 50)}${message.length > 50 ? '...' : ''}`,
            `/messages/${channelId}`
          ));
        
        // Also notify organizer if they are not the sender
        if (tripData.organizer_id !== user.uid && !membersSnap.docs.some(d => d.data().user_id === tripData.organizer_id)) {
          notificationPromises.push(createNotification(
            tripData.organizer_id,
            'new_message',
            `New message in ${tripData.destination_city}`,
            `${senderName} sent a message: ${message.trim().substring(0, 50)}${message.length > 50 ? '...' : ''}`,
            `/messages/${channelId}`
          ));
        }

        await Promise.all(notificationPromises);
      } else {
        // Check if it's a direct channel
        const channelRef = doc(db, 'channels', channelId);
        const channelSnap = await getDoc(channelRef);
        if (channelSnap.exists()) {
          const channelData = channelSnap.data();
          if (channelData.type === 'direct') {
            const otherUserId = channelData.participants.find((uid: string) => uid !== user.uid);
            if (otherUserId) {
              await createNotification(
                otherUserId,
                'new_message',
                `New message from ${senderName}`,
                `${message.trim().substring(0, 50)}${message.length > 50 ? '...' : ''}`,
                `/messages/${channelId}`
              );
            }
          }
        }
      }

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-100 relative">
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full right-4 mb-4 z-50">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <Image className="w-5 h-5" />
        </button>
        <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <Paperclip className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${showEmojiPicker ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
