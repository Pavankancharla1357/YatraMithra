import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { useAuth } from '../Auth/AuthContext';
import { motion } from 'motion/react';
import { Check, BarChart2 } from 'lucide-react';

interface PollItemProps {
  pollId: string;
}

export const PollItem: React.FC<PollItemProps> = ({ pollId }) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'polls', pollId), (doc) => {
      if (doc.exists()) {
        setPoll({ id: doc.id, ...doc.data() });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [pollId]);

  const handleVote = async (optionIndex: number) => {
    if (!user || !poll) return;

    const currentVotes = poll.votes || {};
    const userVote = currentVotes[user.uid];

    try {
      if (userVote === optionIndex) {
        // Remove vote if clicking same option
        await updateDoc(doc(db, 'polls', pollId), {
          [`votes.${user.uid}`]: deleteField()
        });
      } else {
        // Add or change vote
        await updateDoc(doc(db, 'polls', pollId), {
          [`votes.${user.uid}`]: optionIndex
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (loading) return <div className="animate-pulse bg-gray-100 h-32 rounded-2xl" />;
  if (!poll) return <div className="text-xs text-gray-400 italic">Poll not found</div>;

  const votes = poll.votes || {};
  const totalVotes = Object.keys(votes).length;
  const voteCounts = poll.options.map((_: any, idx: number) => 
    Object.values(votes).filter(v => v === idx).length
  );

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm max-w-sm w-full">
      <div className="flex items-center space-x-2 mb-4">
        <BarChart2 className="w-5 h-5 text-indigo-600" />
        <h4 className="font-bold text-gray-900">{poll.question}</h4>
      </div>

      <div className="space-y-3">
        {poll.options.map((option: string, idx: number) => {
          const count = voteCounts[idx];
          const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
          const isVoted = votes[user?.uid] === idx;

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              className="w-full relative group"
            >
              <div className="relative z-10 flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 transition-all">
                <div className="flex items-center space-x-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isVoted ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200'
                  }`}>
                    {isVoted && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm font-medium ${isVoted ? 'text-indigo-600' : 'text-gray-700'}`}>
                    {option}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {count}
                </span>
              </div>
              
              {/* Progress Bar Background */}
              <div 
                className="absolute inset-0 bg-indigo-50 rounded-xl transition-all duration-500"
                style={{ width: `${percentage}%`, opacity: totalVotes > 0 ? 0.5 : 0 }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </span>
        {poll.status === 'closed' && (
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
            Closed
          </span>
        )}
      </div>
    </div>
  );
};
