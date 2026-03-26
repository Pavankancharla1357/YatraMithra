import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Expense {
  id?: string;
  trip_id: string;
  paid_by: string;
  paid_by_name: string;
  amount: number;
  currency: string;
  description: string;
  split_among: string[]; // Array of user UIDs
  category: 'food' | 'stay' | 'transport' | 'misc';
  date: string;
  created_at?: any;
}

export interface Settlement {
  from: string;
  from_name: string;
  to: string;
  to_name: string;
  amount: number;
}

export interface UserBalance {
  user_id: string;
  user_name: string;
  balance: number; // positive = should receive, negative = owes
}

export const addExpense = async (expense: Omit<Expense, 'id' | 'created_at'>) => {
  try {
    const docRef = await addDoc(collection(db, `trips/${expense.trip_id}/expenses`), {
      ...expense,
      created_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding expense:", error);
    throw error;
  }
};

export const updateExpense = async (tripId: string, expenseId: string, updates: Partial<Expense>) => {
  try {
    const docRef = doc(db, `trips/${tripId}/expenses`, expenseId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
};

export const deleteExpense = async (tripId: string, expenseId: string) => {
  try {
    const docRef = doc(db, `trips/${tripId}/expenses`, expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

export const subscribeToExpenses = (tripId: string, callback: (expenses: Expense[]) => void) => {
  const q = query(collection(db, `trips/${tripId}/expenses`));
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
    callback(expenses);
  });
};

/**
 * Calculates balances for each user in the trip.
 * @param expenses List of all expenses in the trip
 * @param members List of all members in the trip (with UIDs and names)
 */
export const calculateBalances = (expenses: Expense[], members: { uid: string, name: string }[]): UserBalance[] => {
  const balances: Record<string, number> = {};
  
  // Initialize balances for all members
  members.forEach(member => {
    balances[member.uid] = 0;
  });

  expenses.forEach(expense => {
    const { amount, paid_by, split_among } = expense;
    
    // The person who paid gets the full amount added to their balance
    if (balances[paid_by] !== undefined) {
      balances[paid_by] += amount;
    }

    // Each participant in the split owes an equal share
    const share = amount / split_among.length;
    split_among.forEach(uid => {
      if (balances[uid] !== undefined) {
        balances[uid] -= share;
      }
    });
  });

  return Object.entries(balances).map(([uid, balance]) => ({
    user_id: uid,
    user_name: members.find(m => m.uid === uid)?.name || 'Unknown',
    balance: Math.round(balance * 100) / 100 // Round to 2 decimal places
  }));
};

/**
 * Generates a settlement plan with minimum transactions.
 * Uses a greedy algorithm to match largest debtors with largest creditors.
 */
export const generateSettlementPlan = (userBalances: UserBalance[]): Settlement[] => {
  const settlements: Settlement[] = [];
  
  // Separate debtors and creditors
  let debtors = userBalances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance);
    
  let creditors = userBalances
    .filter(b => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    
    const amount = Math.min(debtor.balance, creditor.balance);
    
    if (amount > 0.01) {
      settlements.push({
        from: debtor.user_id,
        from_name: debtor.user_name,
        to: creditor.user_id,
        to_name: creditor.user_name,
        amount: Math.round(amount * 100) / 100
      });
    }

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) dIdx++;
    if (creditor.balance < 0.01) cIdx++;
  }

  return settlements;
};
