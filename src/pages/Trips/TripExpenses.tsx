import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { AddExpenseModal } from '../../components/Expenses/AddExpenseModal';
import { ChevronLeft, Plus, DollarSign, PieChart, TrendingUp, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TripExpenses: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchTrip = async () => {
      const tripDoc = await getDoc(doc(db, 'trips', id));
      if (tripDoc.exists()) {
        setTrip({ id: tripDoc.id, ...tripDoc.data() });
      }
    };

    fetchTrip();

    const q = query(
      collection(db, 'trips', id, 'expenses'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(exps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Expenses</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-8">
        {/* Summary Card */}
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
          <div className="flex justify-between items-start mb-8">
            <div>
              <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Total Spent</span>
              <h2 className="text-4xl font-extrabold mt-1">${totalSpent.toFixed(2)}</h2>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
              <PieChart className="w-6 h-6" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
            <div>
              <span className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Budget</span>
              <p className="font-bold">${trip?.budget_max || 0}</p>
            </div>
            <div>
              <span className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Remaining</span>
              <p className="font-bold">${((trip?.budget_max || 0) - totalSpent).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 px-2">Recent Transactions</h3>
          {expenses.length > 0 ? (
            expenses.map((exp) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    exp.category === 'food' ? 'bg-amber-50 text-amber-600' :
                    exp.category === 'transport' ? 'bg-indigo-50 text-indigo-600' :
                    exp.category === 'accommodation' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{exp.description}</h4>
                    <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      <User className="w-3 h-3 mr-1" />
                      {exp.paid_by === user?.uid ? 'You' : 'Companion'} • {exp.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-gray-900">-${exp.amount.toFixed(2)}</span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {exp.created_at?.toDate ? new Date(exp.created_at.toDate()).toLocaleDateString() : '...'}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-gray-300 w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No expenses yet</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Keep track of your group spending and split costs easily.
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddExpenseModal
            tripId={id!}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
