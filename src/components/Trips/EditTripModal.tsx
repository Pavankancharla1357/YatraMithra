import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { X, Save, MapPin, Calendar, IndianRupee, Users, Info, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { createNotification } from '../../services/notificationService';
import { CustomSelect } from '../UI/CustomSelect';
import { CustomDatePicker } from '../UI/CustomDatePicker';

interface EditTripModalProps {
  trip: any;
  onClose: () => void;
  onSuccess: (updatedTrip: any) => void;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({ trip, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    destination_city: trip.destination_city,
    destination_country: trip.destination_country,
    start_date: trip.start_date,
    end_date: trip.end_date,
    budget_max: trip.budget_max.toString(),
    max_members: trip.max_members.toString(),
    travel_style: trip.travel_style,
    description: trip.description,
    itinerary: trip.itinerary || '',
    cover_image: trip.cover_image || '',
  });

  const travelStyleOptions = [
    { value: 'budget', label: 'Budget' },
    { value: 'mid_range', label: 'Mid-Range' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'backpacking', label: 'Backpacking' },
  ];

  const maxMembersOptions = [
    { value: '2', label: '2 Members' },
    { value: '3', label: '3 Members' },
    { value: '4', label: '4 Members' },
    { value: '5', label: '5 Members' },
    { value: '6', label: '6 Members' },
    { value: '8', label: '8 Members' },
    { value: '10', label: '10 Members' },
    { value: '15', label: '15 Members' },
    { value: '20', label: '20 Members' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedData = {
        ...formData,
        budget_max: parseInt(formData.budget_max),
        max_members: parseInt(formData.max_members),
        updated_at: new Date().toISOString(),
      };
      
      await updateDoc(doc(db, 'trips', trip.id), updatedData);
      
      // Notify members about trip update
      const membersQ = query(
        collection(db, 'trip_members'),
        where('trip_id', '==', trip.id),
        where('status', '==', 'approved')
      );
      const membersSnap = await getDocs(membersQ);
      
      const notificationPromises = membersSnap.docs
        .map(doc => doc.data().user_id)
        .map(uid => createNotification(
          uid,
          'trip_updated',
          'Trip Updated',
          `The details for your trip to ${updatedData.destination_city} have been updated by the organizer.`,
          `/trips/${trip.id}`
        ));
      
      await Promise.all(notificationPromises);
      
      onSuccess({ ...trip, ...updatedData });
    } catch (error) {
      console.error('Error updating trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-visible shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Edit Trip Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-indigo-600" /> Destination City
              </label>
              <input
                required
                type="text"
                value={formData.destination_city}
                onChange={(e) => setFormData({ ...formData, destination_city: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 hover:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Country</label>
              <input
                required
                type="text"
                value={formData.destination_country}
                onChange={(e) => setFormData({ ...formData, destination_country: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 hover:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomDatePicker
              label="Start Date"
              selected={formData.start_date ? new Date(formData.start_date) : null}
              onChange={(date) => setFormData({ ...formData, start_date: date ? date.toISOString() : '' })}
              required
            />
            <CustomDatePicker
              label="End Date"
              selected={formData.end_date ? new Date(formData.end_date) : null}
              onChange={(date) => setFormData({ ...formData, end_date: date ? date.toISOString() : '' })}
              required
              minDate={formData.start_date ? new Date(formData.start_date) : undefined}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                <IndianRupee className="w-4 h-4 mr-2 text-indigo-600" /> Budget (INR)
              </label>
              <input
                required
                type="number"
                value={formData.budget_max}
                onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 hover:bg-white transition-all"
              />
            </div>
            <CustomSelect
              label="Max Members"
              value={formData.max_members}
              onChange={(val) => setFormData({ ...formData, max_members: val })}
              options={maxMembersOptions}
              icon={<Users className="w-4 h-4 text-indigo-600" />}
            />
            <CustomSelect
              label="Travel Style"
              value={formData.travel_style}
              onChange={(val) => setFormData({ ...formData, travel_style: val })}
              options={travelStyleOptions}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <ImageIcon className="w-4 h-4 mr-2 text-indigo-600" /> Cover Image URL
            </label>
            <input
              type="url"
              value={formData.cover_image}
              onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 hover:bg-white transition-all"
              placeholder="https://images.unsplash.com/..."
            />
            <p className="mt-1 text-[10px] text-gray-400">Leave empty to use default destination image.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <Info className="w-4 h-4 mr-2 text-indigo-600" /> Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 hover:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-indigo-600" /> Itinerary
            </label>
            <textarea
              value={formData.itinerary}
              onChange={(e) => setFormData({ ...formData, itinerary: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 hover:bg-white transition-all"
              placeholder="Day 1: Arrival and check-in&#10;Day 2: City tour and local food&#10;..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'Saving...' : (
                <>
                  <Save className="w-5 h-5 mr-2" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
