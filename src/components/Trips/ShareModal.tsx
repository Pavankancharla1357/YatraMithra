import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Instagram, 
  Twitter, 
  ExternalLink,
  Zap
} from 'lucide-react';
import { getInviteLink } from '../../services/inviteService';

interface ShareModalProps {
  trip: any;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ trip, onClose }) => {
  const [copied, setCopied] = useState(false);
  const inviteLink = getInviteLink(trip.id, trip.invite_code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my trip to ${trip.destination_city}!`,
          text: `Hey! I'm organizing a trip to ${trip.destination_city} on WanderMatch. Join me!`,
          url: inviteLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to WhatsApp
      window.open(`https://wa.me/?text=Join my trip to ${trip.destination_city} on WanderMatch: ${inviteLink}`, '_blank');
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'bg-emerald-500',
      action: () => window.open(`https://wa.me/?text=Join my trip to ${trip.destination_city} on WanderMatch: ${inviteLink}`, '_blank')
    },
    {
      name: 'Instagram',
      icon: <Instagram className="w-6 h-6" />,
      color: 'bg-pink-600',
      action: () => {
        // Instagram doesn't have a direct share URL for stories/posts via web, 
        // so we just copy link and alert
        handleCopy();
        alert('Link copied! You can now paste it in your Instagram story or bio.');
      }
    },
    {
      name: 'Twitter',
      icon: <Twitter className="w-6 h-6" />,
      color: 'bg-sky-500',
      action: () => window.open(`https://twitter.com/intent/tweet?text=Join my trip to ${trip.destination_city} on WanderMatch!&url=${inviteLink}`, '_blank')
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <Share2 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Invite Friends</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Share this trip</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 hover:text-gray-600 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-indigo-50 p-6 rounded-3xl mb-8 border border-indigo-100">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-5 h-5 text-indigo-600 fill-indigo-600" />
              <span className="text-sm font-bold text-indigo-900">Instant Join Link</span>
            </div>
            <div className="flex items-center bg-white p-2 rounded-2xl border border-indigo-100">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-600 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.action}
                className="flex flex-col items-center space-y-2 group"
              >
                <div className={`w-14 h-14 ${option.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  {option.icon}
                </div>
                <span className="text-xs font-bold text-gray-500">{option.name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleShare}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center space-x-2 shadow-xl shadow-gray-200"
          >
            <ExternalLink className="w-5 h-5" />
            <span>More Share Options</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
