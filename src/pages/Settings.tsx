import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Moon, 
  ChevronRight, 
  LogOut, 
  AlertCircle,
  Smartphone,
  CreditCard,
  HelpCircle,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/Auth/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Personal Information', description: 'Update your name, bio, and travel style', color: 'text-blue-600', bg: 'bg-blue-50' },
        { icon: Shield, label: 'Security', description: 'Password, 2FA, and login activity', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { icon: CreditCard, label: 'Payments', description: 'Manage your saved cards and billing', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', description: 'Push, email, and trip alerts', color: 'text-amber-600', bg: 'bg-amber-50' },
        { icon: Globe, label: 'Language & Region', description: 'English (US), INR (₹)', color: 'text-sky-600', bg: 'bg-sky-50' },
        { icon: Moon, label: 'Appearance', description: 'Dark mode, themes, and font size', color: 'text-purple-600', bg: 'bg-purple-50' },
      ]
    },
    {
      title: 'Device',
      items: [
        { icon: Smartphone, label: 'App Settings', description: 'Cache, data usage, and version info', color: 'text-slate-600', bg: 'bg-slate-50' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', description: 'FAQs, contact support, and feedback', color: 'text-rose-600', bg: 'bg-rose-50' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">Settings</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* User Profile Summary */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-8 h-8 text-indigo-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profile?.name || 'Traveler'}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-gray-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-colors"
          >
            View Profile
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {settingsSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-4">
                {section.title}
              </h3>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {section.items.map((item, idx) => (
                  <button
                    key={item.label}
                    className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left ${
                      idx !== section.items.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{item.label}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{item.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Danger Zone */}
          <div>
            <h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-4 ml-4">
              Danger Zone
            </h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-600">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-600">Log Out</p>
                  <p className="text-[10px] text-red-400 font-medium">Sign out of your account on this device</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-200" />
              </button>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-12 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">YatraMitra v1.2.0</p>
          <p className="text-[10px] text-gray-400 mt-1">Made with ❤️ for travelers</p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
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
    </div>
  );
};
