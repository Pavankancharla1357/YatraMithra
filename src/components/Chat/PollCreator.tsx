import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../Auth/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Send, BarChart2 } from 'lucide-react';

interface PollCreatorProps {
  channelId: string;
  onClose: () => void;
}

export const PollCreator: React.FC<PollCreatorProps> = ({ channelId, onClose }) => {
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !question.trim() || options.some(opt => !opt.trim())) return;

    setIsSubmitting(true);
    try {
      // 1. Create the poll document
      const pollRef = await addDoc(collection(db, 'polls'), {
        channel_id: channelId,
        creator_id: user.uid,
        question: question.trim(),
        options: options.map(opt => opt.trim()),
        votes: {},
        created_at: serverTimestamp(),
        status: 'open'
      });

      // 2. Create the message pointing to the poll
      await addDoc(collection(db, 'messages'), {
        channel_id: channelId,
        sender_id: user.uid,
        sender_name: user.displayName || 'Traveler',
        content: `📊 POLL: ${question.trim()}`,
        message_type: 'poll',
        poll_id: pollRef.id,
        created_at: serverTimestamp()
      });

      onClose();
    } catch (error) {
      console.error('Error creating poll:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 max-w-md w-full"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Create a Poll</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should we decide?"
            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            required
          />
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Options</label>
          {options.map((option, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 px-6 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="flex items-center space-x-2 text-indigo-600 font-bold text-xs hover:opacity-80 transition-opacity mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Option</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Creating...' : 'Create Poll'}</span>
        </button>
      </form>
    </motion.div>
  );
};
