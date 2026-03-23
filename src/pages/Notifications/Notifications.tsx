import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { Bell, Check, ExternalLink, Trash2, Clock, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { is_read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read);
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.id), { is_read: true });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Notifications</h1>
            <p className="text-gray-500 font-medium">Stay updated with your travel activities</p>
          </div>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all border border-indigo-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative bg-white p-6 rounded-[2rem] shadow-sm border transition-all hover:shadow-md ${
                    !n.is_read ? 'border-indigo-100 bg-indigo-50/10' : 'border-gray-50'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      !n.is_read ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      <Bell className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`text-base font-black tracking-tight ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </h3>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                        {n.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3 mr-1.5" />
                          {n.created_at ? (
                            n.created_at.toDate ? 
                            formatDistanceToNow(n.created_at.toDate(), { addSuffix: true }) : 
                            formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                          ) : 'Just now'}
                        </div>
                        
                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={() => markAsRead(n.id)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                          >
                            View Details
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!n.is_read && (
                    <div className="absolute top-6 right-6 w-2 h-2 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]" />
                  )}
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bell className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-400 font-medium">You have no new notifications at the moment.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
