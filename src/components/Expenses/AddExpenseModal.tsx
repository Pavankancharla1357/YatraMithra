import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { X, IndianRupee, Tag, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { CustomSelect } from '../UI/CustomSelect';

interface AddExpenseModalProps {
  tripId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ tripId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'food',
    currency: 'INR',
  });
  const [loading, setLoading] = useState(false);

  const categoryOptions = [
    { value: 'food', label: 'Food & Drinks' },
    { value: 'transport', label: 'Transport' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'activity', label: 'Activity' },
    { value: 'misc', label: 'Miscellaneous' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'trips', tripId, 'expenses'), {
        ...formData,
        amount: parseFloat(formData.amount),
        paid_by: user.uid,
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
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-visible shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Add Expense</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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

          <button
            type="submit"
            disabled={loading || !formData.amount}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
