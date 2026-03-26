import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X, Save, Camera, MapPin, Globe, Instagram, Linkedin, Twitter, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

interface EditProfileModalProps {
  profile: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    location_city: profile.location_city || '',
    location_country: profile.location_country || '',
    interests: profile.interests?.join(', ') || '',
    social_links: {
      instagram: profile.social_links?.instagram || '',
      linkedin: profile.social_links?.linkedin || '',
      twitter: profile.social_links?.twitter || '',
    },
    photo_url: profile.photo_url || '',
    cover_url: profile.cover_url || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        ...formData,
        interests: formData.interests.split(',').map(i => i.trim()).filter(i => i !== ''),
        updated_at: new Date().toISOString(),
      });
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Edit Profile</h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">Update your traveler identity</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          {/* Photos Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Profile Photo URL</label>
              <div className="relative group">
                <input
                  type="text"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="https://..."
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Camera className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Cover Photo URL</label>
              <div className="relative group">
                <input
                  type="text"
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="https://..."
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">City</label>
                  <input
                    type="text"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Country</label>
                  <input
                    type="text"
                    value={formData.location_country}
                    onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium resize-none"
                placeholder="Tell other travelers about yourself..."
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Interests (comma separated)</label>
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                placeholder="Hiking, Photography, Street Food..."
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center">
              <Globe className="w-4 h-4 mr-2 text-indigo-600" />
              Social Presence
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.social_links.instagram}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, instagram: e.target.value }
                  })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="Instagram handle"
                />
              </div>
              <div className="relative">
                <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.social_links.linkedin}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, linkedin: e.target.value }
                  })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="LinkedIn profile"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.social_links.twitter}
                  onChange={(e) => setFormData({
                    ...formData,
                    social_links: { ...formData.social_links, twitter: e.target.value }
                  })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  placeholder="Twitter handle"
                />
              </div>
            </div>
          </div>
        </form>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 text-gray-500 font-bold hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
