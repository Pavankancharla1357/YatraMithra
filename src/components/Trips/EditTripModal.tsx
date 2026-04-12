import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { X, Save, MapPin, Calendar, IndianRupee, Users, Info, Image as ImageIcon, Search, Shield, Sparkles, Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createNotification } from '../../services/notificationService';
import { CustomSelect } from '../UI/CustomSelect';
import { CustomDatePicker } from '../UI/CustomDatePicker';
import { LocationAutocomplete } from './LocationAutocomplete';
import { TripSettingsModal } from './TripSettingsModal';
import { runWithAiRotation, getFriendlyAiError } from '../../services/gemini';
import { toast } from 'sonner';

interface ItineraryDay {
  day: number;
  activities: string[];
}

interface EditTripModalProps {
  trip: any;
  onClose: () => void;
  onSuccess: (updatedTrip: any) => void;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({ trip, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [formData, setFormData] = useState({
    destination_city: trip.destination_city,
    destination_country: trip.destination_country,
    destination_lat: trip.destination_lat || 0,
    destination_lng: trip.destination_lng || 0,
    starting_city: trip.starting_city || '',
    starting_country: trip.starting_country || 'India',
    start_date: trip.start_date,
    end_date: trip.end_date,
    budget_max: trip.budget_max.toString(),
    max_members: trip.max_members.toString(),
    travel_style: trip.travel_style,
    description: trip.description,
    status: trip.status || 'open',
    itinerary: (Array.isArray(trip.itinerary) ? trip.itinerary : []) as ItineraryDay[],
    whats_included: (Array.isArray(trip.whats_included) ? trip.whats_included : (trip.includes ? trip.includes.split('\n') : [])) as string[],
    whats_excluded: (Array.isArray(trip.whats_excluded) ? trip.whats_excluded : (trip.excludes ? trip.excludes.split('\n') : [])) as string[],
    cover_image: trip.cover_image || '',
    settings: trip.settings || {
      privacy: 'public',
      show_exact_location: true,
      notification_preferences: {
        new_member: true,
        new_message: true,
        expense_update: true,
      },
    },
  });

  const travelStyleOptions = [
    { value: 'budget', label: 'Budget' },
    { value: 'mid_range', label: 'Mid-Range' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'backpacking', label: 'Backpacking' },
  ];

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'full', label: 'Full' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
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

  const generateAIDescription = async () => {
    if (!formData.destination_city) {
      toast.error("Please select a destination first!");
      return;
    }
    
    setIsGenerating(true);
    try {
      const result = await runWithAiRotation(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [{
            parts: [{
              text: `Generate a catchy, engaging travel trip description for a trip starting from ${formData.starting_city}, ${formData.starting_country} to ${formData.destination_city}, ${formData.destination_country}. 
              Travel style: ${formData.travel_style}. 
              Keep it under 150 words. Focus on why someone should join this trip and mention the starting point.`
            }]
          }]
        });
      });
      
      const text = result.text;
      if (text) {
        setFormData({ ...formData, description: text });
        toast.success("AI generated a description for you!");
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      toast.error(getFriendlyAiError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAIItinerary = async () => {
    if (!formData.destination_city || !formData.start_date || !formData.end_date) {
      toast.error("Please select destination and dates first!");
      return;
    }

    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 30) {
      toast.error("AI generation is limited to 30 days for now.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await runWithAiRotation(async (ai) => {
        return await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: [{
            parts: [{
              text: `Generate a day-wise itinerary for a ${diffDays}-day trip starting from ${formData.starting_city}, ${formData.starting_country} to ${formData.destination_city}, ${formData.destination_country}. 
              Travel style: ${formData.travel_style}. 
              The itinerary should start from ${formData.starting_city} and include travel to ${formData.destination_city}.
              Format the response as a JSON array of objects, each with 'day' (number) and 'activities' (array of strings). 
              IMPORTANT: Return ONLY the JSON array, no other text.
              Example: [{"day": 1, "activities": ["Departure from ${formData.starting_city}", "Arrival in ${formData.destination_city}", "Check-in", "Dinner at local market"]}]`
            }]
          }]
        });
      });
      
      let text = result.text;
      if (!text) throw new Error("No response from AI");
      
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsedItinerary = JSON.parse(text);
        if (Array.isArray(parsedItinerary)) {
          setFormData({ ...formData, itinerary: parsedItinerary });
          toast.success("AI generated an itinerary for you!");
        } else {
          throw new Error("Invalid itinerary format received");
        }
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw text:", text);
        toast.error("AI returned an invalid format. Please try again.");
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      toast.error(getFriendlyAiError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const addItineraryDay = () => {
    setFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, { day: prev.itinerary.length + 1, activities: [''] }]
    }));
  };

  const updateActivity = (dayIndex: number, activityIndex: number, value: string) => {
    const newItinerary = [...formData.itinerary];
    newItinerary[dayIndex].activities[activityIndex] = value;
    setFormData({ ...formData, itinerary: newItinerary });
  };

  const addActivity = (dayIndex: number) => {
    const newItinerary = [...formData.itinerary];
    newItinerary[dayIndex].activities.push('');
    setFormData({ ...formData, itinerary: newItinerary });
  };

  const removeActivity = (dayIndex: number, activityIndex: number) => {
    const newItinerary = [...formData.itinerary];
    newItinerary[dayIndex].activities.splice(activityIndex, 1);
    setFormData({ ...formData, itinerary: newItinerary });
  };

  const removeDay = (dayIndex: number) => {
    const newItinerary = formData.itinerary.filter((_, i) => i !== dayIndex)
      .map((day, i) => ({ ...day, day: i + 1 }));
    setFormData({ ...formData, itinerary: newItinerary });
  };

  const addIncluded = () => setFormData(prev => ({ ...prev, whats_included: [...prev.whats_included, ''] }));
  const removeIncluded = (index: number) => setFormData(prev => ({ ...prev, whats_included: prev.whats_included.filter((_, i) => i !== index) }));
  const updateIncluded = (index: number, value: string) => {
    const newIncluded = [...formData.whats_included];
    newIncluded[index] = value;
    setFormData({ ...formData, whats_included: newIncluded });
  };

  const addExcluded = () => setFormData(prev => ({ ...prev, whats_excluded: [...prev.whats_excluded, ''] }));
  const removeExcluded = (index: number) => setFormData(prev => ({ ...prev, whats_excluded: prev.whats_excluded.filter((_, i) => i !== index) }));
  const updateExcluded = (index: number, value: string) => {
    const newExcluded = [...formData.whats_excluded];
    newExcluded[index] = value;
    setFormData({ ...formData, whats_excluded: newExcluded });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedData = {
        ...formData,
        budget_max: parseInt(formData.budget_max),
        max_members: parseInt(formData.max_members),
        whats_included: formData.whats_included.filter(item => item.trim() !== ''),
        whats_excluded: formData.whats_excluded.filter(item => item.trim() !== ''),
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
                <MapPin className="w-4 h-4 mr-2 text-indigo-600" /> Starting Point
              </label>
              <LocationAutocomplete
                onSelect={(location) => {
                  setFormData({
                    ...formData,
                    starting_city: location.city || '',
                    starting_country: location.country || 'India'
                  });
                }}
                defaultValue={formData.starting_city}
                historyKey="recent_starting_points"
                placeholder="Where does the trip start?"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-indigo-600" /> Destination
              </label>
              <LocationAutocomplete
                onSelect={(location) => {
                  setFormData({
                    ...formData,
                    destination_city: location.city || '',
                    destination_country: location.country || 'India',
                    destination_lat: location.lat,
                    destination_lng: location.lng
                  });
                }}
                defaultValue={formData.destination_city}
                historyKey="recent_destinations"
                placeholder="Where are you planning to go?"
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
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+/, '');
                  setFormData({ ...formData, budget_max: val === '' ? '0' : val });
                }}
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
            <CustomSelect
              label="Trip Status"
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              options={statusOptions}
              icon={<Info className="w-4 h-4 text-indigo-600" />}
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <Info className="w-4 h-4 mr-2 text-indigo-600" /> Description
              </label>
              <button
                type="button"
                onClick={generateAIDescription}
                disabled={isGenerating}
                className="flex items-center space-x-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>AI Generate</span>
              </button>
            </div>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-gray-50 hover:bg-white transition-all"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-indigo-600" /> Itinerary
              </label>
              <button
                type="button"
                onClick={generateAIItinerary}
                disabled={isGenerating}
                className="flex items-center space-x-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>AI Planner</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <AnimatePresence>
                {formData.itinerary.map((day, dIdx) => (
                  <motion.div
                    key={dIdx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group"
                  >
                    <button 
                      type="button"
                      onClick={() => removeDay(dIdx)}
                      className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 shadow-sm border border-gray-100">
                        {day.day}
                      </span>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Day {day.day}</h3>
                    </div>
                    <div className="space-y-2">
                      {day.activities.map((activity, aIdx) => (
                        <div key={aIdx} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={activity}
                            onChange={(e) => updateActivity(dIdx, aIdx, e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder={`Activity ${aIdx + 1}...`}
                          />
                          <button 
                            type="button"
                            onClick={() => removeActivity(dIdx, aIdx)}
                            className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addActivity(dIdx)}
                        className="flex items-center space-x-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors ml-1 mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Activity</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <button
                type="button"
                onClick={addItineraryDay}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Add Day</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> What's Included
              </label>
              <div className="space-y-2">
                {formData.whats_included.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateIncluded(idx, e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="e.g., Accommodation"
                    />
                    <button type="button" onClick={() => removeIncluded(idx)} className="p-2 text-gray-300 hover:text-rose-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIncluded}
                  className="flex items-center space-x-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors ml-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 flex items-center">
                <X className="w-4 h-4 mr-2 text-rose-600" /> What's Excluded
              </label>
              <div className="space-y-2">
                {formData.whats_excluded.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateExcluded(idx, e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="e.g., Personal Expenses"
                    />
                    <button type="button" onClick={() => removeExcluded(idx)} className="p-2 text-gray-300 hover:text-rose-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addExcluded}
                  className="flex items-center space-x-1 text-[10px] font-black text-rose-600 uppercase tracking-widest hover:text-rose-700 transition-colors ml-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col space-y-4">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all border border-gray-200 flex items-center justify-center"
            >
              <Shield className="w-5 h-5 mr-2 text-indigo-600" /> Trip Settings
            </button>

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

        <TripSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={formData.settings}
          onUpdate={(settings) => setFormData({ ...formData, settings })}
        />
      </motion.div>
    </div>
  );
};
