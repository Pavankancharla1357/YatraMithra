import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/Auth/AuthContext';
import { motion } from 'motion/react';
import { Check, BarChart2 } from 'lucide-react';
import { PollItem } from './PollItem';

interface MessageItemProps {
  message: any;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { user } = useAuth();
  const isMe = message.sender_id === user?.uid;
  const isSystem = message.message_type === 'system';
  const isPoll = message.message_type === 'poll';

  if (isSystem) {
    return (
      <div className="flex justify-center my-6">
        <div className="bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-3xl text-center max-w-md shadow-sm">
          <p className="text-sm font-bold text-indigo-700 leading-relaxed italic">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <Link to={`/profile/${message.sender_id}`} className="flex items-center space-x-1 mb-1 ml-1 hover:opacity-80 transition-opacity">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
              {message.sender_name || 'Companion'}
            </span>
            {message.sender_verified && (
              <div className="bg-blue-500 rounded-full p-0.5 shadow-sm" title="Verified Traveler">
                <Check className="w-2 h-2 text-white" strokeWidth={4} />
              </div>
            )}
          </Link>
        )}
        
        {isPoll ? (
          <PollItem pollId={message.poll_id} />
        ) : (
          <div
            className={`px-4 py-3 rounded-2xl shadow-sm ${
              isMe
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-white text-gray-900 border border-gray-100 rounded-tl-none'
            }`}
          >
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
        )}

        <span className="text-[10px] text-gray-400 mt-1 mx-1">
          {message.created_at?.toDate ? new Date(message.created_at.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
        </span>
      </div>
    </motion.div>
  );
};
