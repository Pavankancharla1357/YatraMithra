import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { X, IndianRupee, Tag, Info, Users, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { CustomSelect } from '../UI/CustomSelect';

interface AddExpenseModalProps {
  tripId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Member {
  uid: string;
  name: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ tripId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'food',
    currency: 'INR',
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        const tripData = tripSnap.data();

        const membersQ = query(collection(db, 'trip_members'), where('trip_id', '==', tripId), where('status', '==', 'approved'));
        const membersSnap = await getDocs(membersQ);
        
        const memberIds = membersSnap.docs.map(d => d.data().user_id);
        if (tripData?.organizer_id && !memberIds.includes(tripData.organizer_id)) {
          memberIds.push(tripData.organizer_id);
        }

        const memberProfiles = await Promise.all(
          memberIds.map(uid => getDoc(doc(db, 'users', uid)))
        );

        const fetchedMembers = memberProfiles
          .filter(p => p.exists())
          .map(p => ({ uid: p.id, name: p.data()?.name || 'Unknown' }));

        setMembers(fetchedMembers);
        setSelectedParticipants(fetchedMembers.map(m => m.uid)); // Default to all members
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setFetchingMembers(false);
      }
    };

    fetchMembers();
  }, [tripId]);

  const categoryOptions = [
    { value: 'food', label: 'Food & Drinks' },
    { value: 'transport', label: 'Transport' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'activity', label: 'Activity' },
    { value: 'misc', label: 'Miscellaneous' },
  ];

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedParticipants.length === 0) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'trips', tripId, 'expenses'), {
        ...formData,
        amount: parseFloat(formData.amount),
        paid_by: user.uid,
        paid_by_name: user.displayName || 'Me',
        split_among: selectedParticipants,
        created_at: serverTimestamp(),
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Add Expense</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <IndianRupee className="w-4 h-4 mr-2 text-indigo-600" /> Amount
            </label>
            <input
              required
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-all"
              placeholder="0.00"
            />
          </div>

          <CustomSelect
            label="Category"
            value={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val })}
            options={categoryOptions}
            icon={<Tag className="w-4 h-4 text-indigo-600" />}
          />

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <Info className="w-4 h-4 mr-2 text-indigo-600" /> Description
            </label>
            <input
              required
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-all"
              placeholder="e.g. Dinner at Shibuya"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
              <Users className="w-4 h-4 mr-2 text-indigo-600" /> Split Among
            </label>
            {fetchingMembers ? (
              <div className="text-sm text-gray-400">Loading members...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {members.map(member => (
                  <button
                    key={member.uid}
                    type="button"
                    onClick={() => toggleParticipant(member.uid)}
                    className={`flex items-center justify-between px-4 py-2 rounded-xl border text-xs font-medium transition-all ${
                      selectedParticipants.includes(member.uid)
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <span className="truncate mr-1">{member.uid === user?.uid ? 'You' : member.name}</span>
                    {selectedParticipants.includes(member.uid) && <Check className="w-3 h-3 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !formData.amount || selectedParticipants.length === 0}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

