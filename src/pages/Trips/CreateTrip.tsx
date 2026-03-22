import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/Auth/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { MapPin, Calendar, Users, IndianRupee, Info, Plane, Briefcase } from 'lucide-react';
import { CustomSelect } from '../../components/UI/CustomSelect';
import { CustomDatePicker } from '../../components/UI/CustomDatePicker';

export const CreateTrip: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    destination_city: '',
    destination_country: 'India',
    start_date: '',
    end_date: '',
    budget_max: '',
    max_members: '4',
    travel_style: 'mid_range',
    description: '',
    itinerary: '',
    trip_types: [] as string[],
    is_women_only: false,
  });

  const tripTypeOptions = [
    'Budget', 'Adventure', 'Trekking', 'Nature', 'Luxury', 'Culture', 'Backpacking', 'Relaxation', 'Foodie'
  ];

  const maxMembersOptions = [
    { value: '2', label: '2 people' },
    { value: '3', label: '3 people' },
    { value: '4', label: '4 people' },
    { value: '5', label: '5 people' },
    { value: '6', label: '6 people' },
    { value: '8', label: '8 people' },
    { value: '10', label: '10 people' },
  ];

  const travelStyleOptions = [
    { value: 'budget', label: 'Budget' },
    { value: 'mid_range', label: 'Mid-Range' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'backpacking', label: 'Backpacking' },
  ];

  const toggleTripType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      trip_types: prev.trip_types.includes(type)
        ? prev.trip_types.filter(t => t !== type)
        : [...prev.trip_types, type]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'trips'), {
        ...formData,
        organizer_id: user.uid,
        organizer_name: profile?.name || user.displayName || 'Organizer',
        organizer_verified: profile?.is_verified || false,
        organizer_vibe: profile?.vibe_quiz_results || null,
        budget_max: parseInt(formData.budget_max),
        max_members: parseInt(formData.max_members),
        current_members: 1,
        status: 'open',
        created_at: new Date().toISOString(),
      });

      // Add organizer as an approved member
      await addDoc(collection(db, 'trip_members'), {
        trip_id: docRef.id,
        user_id: user.uid,
        role: 'organizer',
        status: 'approved',
        joined_at: new Date().toISOString(),
      });

      navigate(`/trips/${docRef.id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Create a New Adventure</h1>
          <p className="mt-2 text-lg text-gray-500">Share your travel plans and find the perfect companions.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-all"
                  placeholder="e.g. Manali"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Country</label>
                <input
                  required
                  type="text"
                  value={formData.destination_country}
                  onChange={(e) => setFormData({ ...formData, destination_country: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-all"
                  placeholder="e.g. India"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CustomDatePicker
                label="Start Date"
                icon={<Calendar className="w-4 h-4 text-indigo-600" />}
                selected={formData.start_date ? new Date(formData.start_date) : null}
                onChange={(date) => setFormData({ ...formData, start_date: date ? date.toISOString() : '' })}
                minDate={new Date()}
                placeholder="Select start date"
              />
              <CustomDatePicker
                label="End Date"
                icon={<Calendar className="w-4 h-4 text-indigo-600" />}
                selected={formData.end_date ? new Date(formData.end_date) : null}
                onChange={(date) => setFormData({ ...formData, end_date: date ? date.toISOString() : '' })}
                minDate={formData.start_date ? new Date(formData.start_date) : new Date()}
                placeholder="Select end date"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <IndianRupee className="w-4 h-4 mr-2 text-indigo-600" /> Max Budget (INR)
                </label>
                <input
                  required
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-all"
                  placeholder="25000"
                />
              </div>
              <CustomSelect
                label="Max Members"
                icon={<Users className="w-4 h-4 text-indigo-600" />}
                value={formData.max_members}
                onChange={(val) => setFormData({ ...formData, max_members: val })}
                options={maxMembersOptions}
              />
              <CustomSelect
                label="Travel Style"
                icon={<Briefcase className="w-4 h-4 text-indigo-600" />}
                value={formData.travel_style}
                onChange={(val) => setFormData({ ...formData, travel_style: val })}
                options={travelStyleOptions}
              />
            </div>

            {profile?.gender === 'female' && (
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Women Only Trip</h3>
                  <p className="text-xs text-gray-500">Only female travelers will be able to see and join this trip.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_women_only}
                    onChange={(e) => setFormData({ ...formData, is_women_only: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center">
                <Info className="w-4 h-4 mr-2 text-indigo-600" /> Type of Trip (Multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {tripTypeOptions.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleTripType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                      formData.trip_types.includes(type)
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none hover:border-indigo-300 transition-all"
                placeholder="Describe your trip, planned activities, and what kind of companions you're looking for..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-indigo-600" /> Itinerary (Optional)
              </label>
              <textarea
                value={formData.itinerary}
                onChange={(e) => setFormData({ ...formData, itinerary: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none hover:border-indigo-300 transition-all"
                placeholder="Day 1: Arrival and check-in&#10;Day 2: City tour and local food&#10;..."
              />
              <p className="mt-2 text-xs text-gray-400 italic">You can also provide this later from the trip details page.</p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? 'Creating...' : (
                  <>
                    <Plane className="w-5 h-5 mr-2" /> Publish Trip
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
