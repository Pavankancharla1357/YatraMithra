import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(msgs);
      setUnreadCount(msgs.filter((n: any) => !n.is_read).length);
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

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-500 hover:text-indigo-600 transition-colors bg-gray-50 rounded-xl"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={`p-4 border-b border-gray-50 transition-colors hover:bg-gray-50 ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                        {!n.is_read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="p-1 text-gray-400 hover:text-indigo-600"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{n.message}</p>
                      <Link 
                        to={n.link}
                        onClick={() => {
                          markAsRead(n.id);
                          setShowDropdown(false);
                        }}
                        className="inline-flex items-center text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
                      >
                        View Details <ExternalLink className="w-2.5 h-2.5 ml-1" />
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                <Link 
                  to="/notifications" 
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-600"
                  onClick={() => setShowDropdown(false)}
                >
                  View all notifications
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
