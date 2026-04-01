import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/AuthContext';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Compass, MessageSquare, User, LogOut, Menu, X, AlertCircle, Users, Sparkles, Bell, LayoutDashboard } from 'lucide-react';
import { NotificationBell } from '../Notifications/NotificationBell';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';

export const Navbar: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const isAndroid = Capacitor.getPlatform() === 'android';

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      where('type', '==', 'new_message'),
      where('is_read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnreadMessages(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
    setShowLogoutConfirm(false);
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={user ? "/discover" : "/"} className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Compass className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">YatraMitra</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/discover" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">Discover Trips</Link>
            <Link to="/buddy-finder" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors flex items-center">
              <Users className="w-4 h-4 mr-1" />
              Buddy Finder
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors flex items-center">
                  <LayoutDashboard className="w-4 h-4 mr-1" />
                  Dashboard
                </Link>
                <Link to="/messages" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors flex items-center relative">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Messages
                  {hasUnreadMessages && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 border border-white rounded-full" />
                  )}
                </Link>
                <NotificationBell />
                <Link to="/expert-planner" className="text-gray-400 hover:text-indigo-600 font-medium transition-colors flex items-center gap-1 text-sm">
                  <Sparkles className="w-3 h-3" />
                  AI Helper
                </Link>
                <Link to="/profile" className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="text-indigo-600 w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{profile?.name || 'Profile'}</span>
                </Link>
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/expert-planner" className="text-gray-400 hover:text-indigo-600 font-medium transition-colors flex items-center gap-1 text-sm mr-4">
                  <Sparkles className="w-3 h-3" />
                  AI Helper
                </Link>
                <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium">Login</Link>
                <Link to="/register" className="bg-indigo-600 text-white px-5 py-2 rounded-full font-medium hover:bg-indigo-700 transition-all shadow-sm">
                  Join Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            {isAndroid && user ? (
              <>
                <NotificationBell />
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu - Only show if not Android or not logged in */}
      {isOpen && (!isAndroid || !user) && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-4 shadow-lg">
          <Link to="/discover" className="block text-gray-900 font-black py-2 text-lg">Discover Trips</Link>
          <Link to="/buddy-finder" className="block text-gray-900 font-black py-2 text-lg">Buddy Finder</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="block text-gray-600 font-medium py-2">Dashboard</Link>
              <Link to="/messages" className="block text-gray-600 font-medium py-2 relative inline-flex items-center">
                Messages
                {hasUnreadMessages && (
                  <span className="ml-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Link>
              <Link to="/profile" className="block text-gray-600 font-medium py-2">Profile</Link>
              <Link to="/expert-planner" className="block text-indigo-400 font-medium py-2 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />
                AI Helper
              </Link>
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="block w-full text-left text-red-500 font-medium py-2"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/expert-planner" className="block text-indigo-400 font-medium py-2 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />
                AI Helper
              </Link>
              <Link to="/login" className="block text-gray-600 font-medium py-2">Login</Link>
              <Link to="/register" className="block bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium text-center">
                Join Now
              </Link>
            </>
          )}
        </div>
      )}
      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Are you sure?</h3>
              <p className="text-gray-600 mb-8">
                You're about to log out of your account. You'll need to sign in again to access your trips.
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  Yes, Log Out
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-3.5 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  No, Stay Logged In
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};
