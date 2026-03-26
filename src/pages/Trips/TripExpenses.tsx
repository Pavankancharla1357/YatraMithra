import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { AddExpenseModal } from '../../components/Expenses/AddExpenseModal';
import { 
  ChevronLeft, 
  Plus, 
  DollarSign, 
  PieChart, 
  TrendingUp, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateBalances, generateSettlementPlan, Expense, UserBalance, Settlement } from '../../services/expenseService';

export const TripExpenses: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trip, setTrip] = useState<any>(null);
  const [members, setMembers] = useState<{ uid: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements'>('expenses');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        // Fetch Trip
        const tripDoc = await getDoc(doc(db, 'trips', id));
        if (tripDoc.exists()) {
          const tripData = { id: tripDoc.id, ...tripDoc.data() } as any;
          setTrip(tripData);

          // Fetch Members
          const membersQ = query(collection(db, 'trip_members'), where('trip_id', '==', id), where('status', '==', 'approved'));
          const membersSnap = await getDocs(membersQ);
          const memberIds = membersSnap.docs.map(d => d.data().user_id);
          
          if (tripData.organizer_id && !memberIds.includes(tripData.organizer_id)) {
            memberIds.push(tripData.organizer_id);
          }

          const memberProfiles = await Promise.all(
            memberIds.map(uid => getDoc(doc(db, 'users', uid)))
          );

          const fetchedMembers = memberProfiles
            .filter(p => p.exists())
            .map(p => ({ uid: p.id, name: p.data()?.name || 'Unknown' }));
          
          setMembers(fetchedMembers);
        }
      } catch (error) {
        console.error("Error fetching trip data:", error);
      }
    };

    fetchData();

    const q = query(
      collection(db, 'trips', id, 'expenses'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
      setExpenses(exps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const totalSpent = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount, 0), [expenses]);
  
  const userBalances = useMemo(() => {
    if (members.length === 0) return [];
    return calculateBalances(expenses, members);
  }, [expenses, members]);

  const settlementPlan = useMemo(() => {
    return generateSettlementPlan(userBalances);
  }, [userBalances]);

  const currentUserBalance = useMemo(() => {
    return userBalances.find(b => b.user_id === user?.uid);
  }, [userBalances, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-6 shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button onClick={() => navigate(`/trips/${id}`)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Expense Split</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl">
            {(['expenses', 'balances', 'settlements'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl capitalize transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-8">
        {activeTab === 'expenses' && (
          <>
            {/* Summary Card */}
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Total Trip Spending</span>
                  <h2 className="text-4xl font-extrabold mt-1">₹{totalSpent.toLocaleString()}</h2>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                  <PieChart className="w-6 h-6" />
                </div>
              </div>
              
              {currentUserBalance && (
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-indigo-50">Your Net Balance</span>
                    <span className={`text-lg font-bold ${currentUserBalance.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {currentUserBalance.balance >= 0 ? '+' : ''}₹{currentUserBalance.balance.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mt-1">
                    {currentUserBalance.balance >= 0 ? 'You are owed' : 'You owe others'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                <div>
                  <span className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Budget</span>
                  <p className="font-bold">₹{trip?.budget_max?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <span className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Remaining</span>
                  <p className="font-bold">₹{Math.max(0, (trip?.budget_max || 0) - totalSpent).toLocaleString()}</p>
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
                        exp.category === 'stay' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{exp.description}</h4>
                        <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          <User className="w-3 h-3 mr-1" />
                          {exp.paid_by === user?.uid ? 'You' : exp.paid_by_name || 'Companion'} paid • {exp.category}
                        </div>
                        <div className="flex items-center text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">
                          <Users className="w-3 h-3 mr-1" />
                          Split with {exp.split_among.length} people
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-gray-900">₹{exp.amount.toLocaleString()}</span>
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
          </>
        )}

        {activeTab === 'balances' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 px-2">Member Balances</h3>
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              {userBalances.map((balance, idx) => (
                <div 
                  key={balance.user_id}
                  className={`p-6 flex items-center justify-between ${idx !== userBalances.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {balance.user_id === user?.uid ? 'You' : balance.user_name}
                      </h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {balance.balance >= 0 ? 'Should receive' : 'Owes'}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right font-extrabold text-lg ${balance.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {balance.balance >= 0 ? '+' : ''}₹{balance.balance.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settlements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-gray-900">Settlement Plan</h3>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-widest">
                Optimized
              </span>
            </div>
            
            {settlementPlan.length > 0 ? (
              <div className="space-y-3">
                {settlementPlan.map((settlement, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">From</p>
                        <h4 className="font-bold text-gray-900">{settlement.from === user?.uid ? 'You' : settlement.from_name}</h4>
                      </div>
                      <div className="flex flex-col items-center px-4">
                        <div className="text-indigo-600 font-extrabold text-lg mb-1">₹{settlement.amount.toLocaleString()}</div>
                        <ArrowRight className="w-5 h-5 text-indigo-300" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">To</p>
                        <h4 className="font-bold text-gray-900">{settlement.to === user?.uid ? 'You' : settlement.to_name}</h4>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                <div className="mt-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-start space-x-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-900">Settlement Strategy</h4>
                    <p className="text-sm text-emerald-700 mt-1">
                      This plan minimizes the total number of transactions required to settle all debts within the group.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-emerald-400 w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">All Settled Up!</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  No pending transactions. Everyone is even.
                </p>
              </div>
            )}
          </div>
        )}
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

