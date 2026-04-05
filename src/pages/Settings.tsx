import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronLeft,
  Save,
  Camera,
  Check,
  Trash2,
  Plus,
  ExternalLink,
  Mail,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
  History,
  Plane,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/Auth/AuthContext';
import { auth, db } from '../firebase';
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

type SettingsView = 'main' | 'personal' | 'security' | 'payments' | 'notifications' | 'language' | 'appearance' | 'app' | 'help';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sub-view states
  const [personalData, setPersonalData] = useState({
    name: '',
    bio: '',
    location_city: '',
    location_country: '',
    photo_url: '',
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    push: true,
    email: true,
    trips: true,
    messages: true,
    marketing: false,
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    darkMode: false,
    fontSize: 'medium',
    theme: 'indigo',
  });

  const [languageSettings, setLanguageSettings] = useState({
    language: 'English (US)',
    region: 'India',
    currency: 'INR (₹)',
  });

  useEffect(() => {
    if (profile) {
      setPersonalData({
        name: profile.name || '',
        bio: profile.bio || '',
        location_city: profile.location_city || '',
        location_country: profile.location_country || '',
        photo_url: profile.photo_url || '',
      });
      
      if (profile.settings) {
        if (profile.settings.notifications) {
          setNotificationSettings(prev => ({ ...prev, ...profile.settings.notifications }));
        }
        if (profile.settings.appearance) {
          setAppearanceSettings(prev => ({ ...prev, ...profile.settings.appearance }));
        }
        if (profile.settings.language) {
          setLanguageSettings(prev => ({ ...prev, ...profile.settings.language }));
        }
      }
    }
  }, [profile]);

  // Apply Appearance Settings
  useEffect(() => {
    // Dark Mode
    if (appearanceSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Font Size
    const fontSizes: Record<string, string> = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    document.documentElement.style.fontSize = fontSizes[appearanceSettings.fontSize] || '16px';

    // Accent Color (CSS Variable)
    const colors: Record<string, string> = {
      indigo: '#4f46e5',
      rose: '#e11d48',
      emerald: '#10b981',
      amber: '#f59e0b',
      sky: '#0ea5e9'
    };
    document.documentElement.style.setProperty('--accent-color', colors[appearanceSettings.theme] || '#4f46e5');
  }, [appearanceSettings]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...personalData,
        updated_at: new Date().toISOString(),
      });
      await refreshProfile();
      toast.success('Profile updated successfully');
      setCurrentView('main');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, securityData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, securityData.newPassword);
      toast.success('Password updated successfully');
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '', showCurrent: false, showNew: false });
      setCurrentView('main');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (category: string, data: any) => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`settings.${category}`]: data,
        updated_at: new Date().toISOString(),
      });
      toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} settings updated`);
      setCurrentView('main');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error(`Failed to update ${category} settings`);
    } finally {
      setLoading(false);
    }
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { id: 'personal', icon: User, label: 'Personal Information', description: 'Update your name, bio, and travel style', color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'security', icon: Shield, label: 'Security', description: 'Password, 2FA, and login activity', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'payments', icon: CreditCard, label: 'Payments', description: 'Manage your saved cards and billing', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { id: 'notifications', icon: Bell, label: 'Notifications', description: 'Push, email, and trip alerts', color: 'text-amber-600', bg: 'bg-amber-50' },
        { id: 'language', icon: Globe, label: 'Language & Region', description: 'English (US), INR (₹)', color: 'text-sky-600', bg: 'bg-sky-50' },
        { id: 'appearance', icon: Moon, label: 'Appearance', description: 'Dark mode, themes, and font size', color: 'text-purple-600', bg: 'bg-purple-50' },
      ]
    },
    {
      title: 'Device',
      items: [
        { id: 'app', icon: Smartphone, label: 'App Settings', description: 'Cache, data usage, and version info', color: 'text-slate-600', bg: 'bg-slate-50' },
      ]
    },
    {
      title: 'Support',
      items: [
        { id: 'help', icon: HelpCircle, label: 'Help Center', description: 'FAQs, contact support, and feedback', color: 'text-rose-600', bg: 'bg-rose-50' },
      ]
    }
  ];

  const renderMainView = () => (
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
                  onClick={() => setCurrentView(item.id as SettingsView)}
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
  );

  const renderPersonalView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative group">
              <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                {personalData.photo_url ? (
                  <img src={personalData.photo_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-10 h-10 text-indigo-600" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                <Camera className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile Photo</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <input
                type="text"
                value={personalData.name}
                onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bio</label>
              <textarea
                value={personalData.bio}
                onChange={(e) => setPersonalData({ ...personalData, bio: e.target.value })}
                rows={4}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium resize-none"
                placeholder="Tell us about your travel style..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City</label>
                <input
                  type="text"
                  value={personalData.location_city}
                  onChange={(e) => setPersonalData({ ...personalData, location_city: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Country</label>
                <input
                  type="text"
                  value={personalData.location_country}
                  onChange={(e) => setPersonalData({ ...personalData, location_country: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="e.g. India"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Photo URL</label>
              <input
                type="text"
                value={personalData.photo_url}
                onChange={(e) => setPersonalData({ ...personalData, photo_url: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Changes
        </button>
      </form>
    </div>
  );

  const renderSecurityView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={handleChangePassword} className="space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
              <p className="text-xs text-gray-500">Update your account password</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
              <div className="relative">
                <input
                  type={securityData.showCurrent ? 'text' : 'password'}
                  required
                  value={securityData.currentPassword}
                  onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setSecurityData({ ...securityData, showCurrent: !securityData.showCurrent })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {securityData.showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative">
                <input
                  type={securityData.showNew ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={securityData.newPassword}
                  onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setSecurityData({ ...securityData, showNew: !securityData.showNew })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {securityData.showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={securityData.confirmPassword}
                onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Two-Factor Auth</h3>
                <p className="text-xs text-gray-500">Secure your account with 2FA</p>
              </div>
            </div>
            <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Update Password
        </button>
      </form>
    </div>
  );

  const [savedCards, setSavedCards] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.settings?.payments?.cards) {
      setSavedCards(profile.settings.payments.cards);
    } else if (profile?.name) {
      setSavedCards([{ id: '1', type: 'Visa', last4: '4242', expiry: '12/25', holder: profile.name }]);
    }
  }, [profile]);

  const handleAddCard = async () => {
    if (!user) return;
    const newCard = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Mastercard',
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      expiry: '08/27',
      holder: profile?.name || 'Traveler'
    };
    const updatedCards = [...savedCards, newCard];
    setSavedCards(updatedCards);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'settings.payments.cards': updatedCards,
        updated_at: new Date().toISOString(),
      });
      toast.success('New payment method added');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!user) return;
    const updatedCards = savedCards.filter(c => c.id !== cardId);
    setSavedCards(updatedCards);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'settings.payments.cards': updatedCards,
        updated_at: new Date().toISOString(),
      });
      toast.success('Payment method removed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove card');
    }
  };

  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !feedback.trim()) return;
    setSubmittingFeedback(true);
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'feedback'), {
        uid: user.uid,
        email: user.email,
        content: feedback,
        created_at: new Date().toISOString(),
      });
      toast.success('Thank you for your feedback!');
      setFeedback('');
      setCurrentView('main');
    } catch (error) {
      console.error(error);
      toast.error('Failed to send feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderPaymentsView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Saved Cards</h3>
        <div className="space-y-4">
          {savedCards.map((card) => (
            <div key={card.id} className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-8">
                <CreditCard className="w-8 h-8 text-indigo-400" />
                <div className="flex gap-2">
                  <span className="text-xs font-black uppercase tracking-widest opacity-60">{card.type}</span>
                  <button 
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-xl font-mono tracking-[0.2em]">•••• •••• •••• {card.last4}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Card Holder</p>
                    <p className="text-xs font-bold uppercase tracking-widest">{card.holder}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Expires</p>
                    <p className="text-xs font-bold uppercase tracking-widest">{card.expiry}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button 
            onClick={handleAddCard}
            className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Card
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Billing History</h3>
        <div className="space-y-4">
          {[
            { id: 1, label: 'Premium Subscription', date: 'Mar 15, 2024', amount: '₹499', status: 'Success' },
            { id: 2, label: 'Trip Booking - Manali', date: 'Feb 28, 2024', amount: '₹12,500', status: 'Success' },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-[10px] text-gray-500 font-medium">{item.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-gray-900">{item.amount}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotificationsView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Notification Channels</h3>
          <div className="space-y-4">
            {[
              { id: 'push', label: 'Push Notifications', description: 'Receive alerts on your device', icon: Bell },
              { id: 'email', label: 'Email Notifications', description: 'Weekly updates and trip summaries', icon: Mail },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationSettings({ ...notificationSettings, [item.id]: !notificationSettings[item.id as keyof typeof notificationSettings] })}
                  className={`w-12 h-6 rounded-full relative transition-colors ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'bg-accent' : 'bg-gray-200'}`}
                >
                  <motion.div
                    animate={{ x: notificationSettings[item.id as keyof typeof notificationSettings] ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Activity Alerts</h3>
          <div className="space-y-4">
            {[
              { id: 'trips', label: 'Trip Updates', description: 'Changes to your joined trips', icon: Plane },
              { id: 'messages', label: 'New Messages', description: 'Direct messages and group chats', icon: MessageSquare },
              { id: 'marketing', label: 'Offers & Promotions', description: 'Exclusive travel deals and tips', icon: Zap },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationSettings({ ...notificationSettings, [item.id]: !notificationSettings[item.id as keyof typeof notificationSettings] })}
                  className={`w-12 h-6 rounded-full relative transition-colors ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'bg-accent' : 'bg-gray-200'}`}
                >
                  <motion.div
                    animate={{ x: notificationSettings[item.id as keyof typeof notificationSettings] ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => handleUpdateSettings('notifications', notificationSettings)}
        disabled={loading}
        className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Save Preferences
      </button>
    </div>
  );

  const renderLanguageView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Language</label>
          <div className="grid grid-cols-1 gap-3">
            {['English (US)', 'Hindi (हिन्दी)', 'Spanish (Español)', 'French (Français)'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguageSettings({ ...languageSettings, language: lang })}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  languageSettings.language === lang ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-600'
                }`}
              >
                <span className="text-sm font-bold">{lang}</span>
                {languageSettings.language === lang && <Check className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Currency</label>
          <div className="grid grid-cols-2 gap-3">
            {['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'].map((curr) => (
              <button
                key={curr}
                onClick={() => setLanguageSettings({ ...languageSettings, currency: curr })}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  languageSettings.currency === curr ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-600'
                }`}
              >
                <span className="text-sm font-bold">{curr}</span>
                {languageSettings.currency === curr && <Check className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => handleUpdateSettings('language', languageSettings)}
        disabled={loading}
        className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        Confirm Changes
      </button>
    </div>
  );

  const renderAppearanceView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Dark Mode</h3>
              <p className="text-xs text-gray-500">Easier on the eyes in low light</p>
            </div>
          </div>
          <button
            onClick={() => setAppearanceSettings({ ...appearanceSettings, darkMode: !appearanceSettings.darkMode })}
            className={`w-12 h-6 rounded-full relative transition-colors ${appearanceSettings.darkMode ? 'bg-accent' : 'bg-gray-200'}`}
          >
            <motion.div
              animate={{ x: appearanceSettings.darkMode ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
          </button>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Accent Color</label>
          <div className="flex gap-4">
            {[
              { id: 'indigo', color: 'bg-indigo-600' },
              { id: 'rose', color: 'bg-rose-600' },
              { id: 'emerald', color: 'bg-emerald-600' },
              { id: 'amber', color: 'bg-amber-600' },
              { id: 'sky', color: 'bg-sky-600' },
            ].map((theme) => (
              <button
                key={theme.id}
                onClick={() => setAppearanceSettings({ ...appearanceSettings, theme: theme.id })}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme.color} ${
                  appearanceSettings.theme === theme.id ? 'ring-4 ring-gray-100 scale-110' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {appearanceSettings.theme === theme.id && <Check className="w-5 h-5 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Font Size</label>
          <div className="flex gap-2">
            {['Small', 'Medium', 'Large'].map((size) => (
              <button
                key={size}
                onClick={() => setAppearanceSettings({ ...appearanceSettings, fontSize: size.toLowerCase() })}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  appearanceSettings.fontSize === size.toLowerCase() ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => handleUpdateSettings('appearance', appearanceSettings)}
        disabled={loading}
        className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        Apply Changes
      </button>
    </div>
  );

  const renderAppView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Storage & Data</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Cache Usage</p>
                <p className="text-[10px] text-gray-500 font-medium">Clear temporary files to free up space</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-gray-900">24.5 MB</p>
                <button
                  onClick={() => toast.success('Cache cleared successfully')}
                  className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1 hover:underline"
                >
                  Clear Cache
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Offline Maps</p>
                <p className="text-[10px] text-gray-500 font-medium">Manage downloaded map regions</p>
              </div>
              <button className="text-[10px] text-indigo-600 font-black uppercase tracking-widest hover:underline">
                Manage
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">About YatraMitra</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Version</p>
              <p className="text-sm font-black text-gray-400">1.2.0 (Build 452)</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Terms of Service</p>
              <ExternalLink className="w-4 h-4 text-gray-300" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Privacy Policy</p>
              <ExternalLink className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHelpView = () => (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              'How do I join a trip?',
              'Is my payment information secure?',
              'How can I verify my identity?',
              'What happens if a trip is cancelled?',
            ].map((q) => (
              <button key={q} className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left hover:bg-white hover:border-indigo-100 transition-all group">
                <span className="text-sm font-bold text-gray-700">{q}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Contact Support</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-6 bg-indigo-50 rounded-2xl text-center space-y-2 hover:bg-indigo-100 transition-all">
              <Mail className="w-6 h-6 text-indigo-600 mx-auto" />
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Email Us</p>
            </button>
            <button className="p-6 bg-emerald-50 rounded-2xl text-center space-y-2 hover:bg-emerald-100 transition-all">
              <MessageSquare className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Chat</p>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Feedback</h3>
        <p className="text-xs text-gray-500 mb-6">Help us improve YatraMitra by sharing your thoughts.</p>
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <textarea
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium resize-none"
            placeholder="What can we do better?"
          />
          <button
            type="submit"
            disabled={submittingFeedback || !feedback.trim()}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submittingFeedback ? <RefreshCw className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );

  const getViewTitle = () => {
    switch (currentView) {
      case 'personal': return 'Personal Info';
      case 'security': return 'Security';
      case 'payments': return 'Payments';
      case 'notifications': return 'Notifications';
      case 'language': return 'Language & Region';
      case 'appearance': return 'Appearance';
      case 'app': return 'App Settings';
      case 'help': return 'Help Center';
      default: return 'Settings';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => currentView === 'main' ? navigate(-1) : setCurrentView('main')}
            className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-black text-gray-900 uppercase tracking-widest">{getViewTitle()}</h1>
          <div className="w-10" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentView === 'main' && renderMainView()}
          {currentView === 'personal' && renderPersonalView()}
          {currentView === 'security' && renderSecurityView()}
          {currentView === 'payments' && renderPaymentsView()}
          {currentView === 'notifications' && renderNotificationsView()}
          {currentView === 'language' && renderLanguageView()}
          {currentView === 'appearance' && renderAppearanceView()}
          {currentView === 'app' && renderAppView()}
          {currentView === 'help' && renderHelpView()}
        </motion.div>
      </AnimatePresence>

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
