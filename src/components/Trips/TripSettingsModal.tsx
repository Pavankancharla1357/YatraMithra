import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Eye, Bell, Check, Lock, Globe, MapPin, MessageSquare, Users, DollarSign } from 'lucide-react';

interface TripSettings {
  privacy: 'public' | 'private';
  show_exact_location: boolean;
  notification_preferences: {
    new_member: boolean;
    new_message: boolean;
    expense_update: boolean;
  };
}

interface TripSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TripSettings;
  onUpdate: (settings: TripSettings) => void;
}

export const TripSettingsModal: React.FC<TripSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate
}) => {
  if (!isOpen) return null;

  const togglePrivacy = () => {
    onUpdate({
      ...settings,
      privacy: settings.privacy === 'public' ? 'private' : 'public'
    });
  };

  const toggleLocation = () => {
    onUpdate({
      ...settings,
      show_exact_location: !settings.show_exact_location
    });
  };

  const toggleNotification = (key: keyof TripSettings['notification_preferences']) => {
    onUpdate({
      ...settings,
      notification_preferences: {
        ...settings.notification_preferences,
        [key]: !settings.notification_preferences[key]
      }
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Trip Settings</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
            {/* Privacy Section */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Lock className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Privacy</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => onUpdate({ ...settings, privacy: 'public' })}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 ${
                    settings.privacy === 'public'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-100 hover:border-gray-200 text-gray-500'
                  }`}
                >
                  <Globe className="w-6 h-6" />
                  <span className="text-sm font-bold">Public</span>
                  <p className="text-[10px] opacity-70">Visible to everyone</p>
                </button>
                <button
                  onClick={() => onUpdate({ ...settings, privacy: 'private' })}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 ${
                    settings.privacy === 'private'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-100 hover:border-gray-200 text-gray-500'
                  }`}
                >
                  <Lock className="w-6 h-6" />
                  <span className="text-sm font-bold">Private</span>
                  <p className="text-[10px] opacity-70">Invite only</p>
                </button>
              </div>
            </section>

            {/* Visibility Section */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Visibility</h4>
              </div>
              <div 
                onClick={toggleLocation}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900">Show Exact Location</span>
                    <p className="text-[10px] text-gray-500">Allow members to see each other on map</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${settings.show_exact_location ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.show_exact_location ? 'left-7' : 'left-1'}`} />
                </div>
              </div>
            </section>

            {/* Notifications Section */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Bell className="w-4 h-4 text-gray-400" />
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Notifications</h4>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'new_member', label: 'New Member Requests', icon: Users },
                  { key: 'new_message', label: 'Group Messages', icon: MessageSquare },
                  { key: 'expense_update', label: 'Expense Updates', icon: DollarSign },
                ].map((item) => (
                  <div 
                    key={item.key}
                    onClick={() => toggleNotification(item.key as any)}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      settings.notification_preferences[item.key as keyof TripSettings['notification_preferences']]
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-200'
                    }`}>
                      {settings.notification_preferences[item.key as keyof TripSettings['notification_preferences']] && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Save Settings
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
