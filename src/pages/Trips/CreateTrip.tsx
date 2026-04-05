import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../components/Auth/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Calendar, Users, IndianRupee, Info, Plane, Briefcase, Search, 
  ChevronRight, ChevronLeft, Sparkles, Image as ImageIcon, Plus, Trash2, 
  Lock, Globe, ShieldCheck, CheckCircle2, Save, Send, Clock, Layout, 
  Compass, Heart, Star, Map, Camera, Coffee, Mountain, Umbrella, 
  Backpack, Tent, Bike, Car, Train, Ship, Hotel, Utensils, Music, 
  ShoppingBag, Camera as CameraIcon, Landmark, Trees, Waves, Sun, 
  Cloud, Wind, Thermometer, Zap, AlertCircle, HelpCircle, Settings,
  Eye, EyeOff, UserCheck, UserPlus, UserMinus, UserX, User,
  ArrowRight, ArrowLeft, Check, X, Loader2, Sparkle
} from 'lucide-react';
import { CustomSelect } from '../../components/UI/CustomSelect';
import { CustomDatePicker } from '../../components/UI/CustomDatePicker';
import { LocationAutocomplete } from '../../components/Trips/LocationAutocomplete';
import { generateInviteCode } from '../../services/inviteService';
import { getGeminiInstance } from '../../services/gemini';

// Initialize Gemini AI
// (Moved inside functions to ensure fresh API key)

interface ItineraryDay {
  day: number;
  activities: string[];
}

export const CreateTrip: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [formData, setFormData] = useState({
    destination_city: '',
    destination_country: 'India',
    destination_lat: 0,
    destination_lng: 0,
    start_date: '',
    end_date: '',
    budget_max: 25000,
    max_members: '4',
    travel_style: 'mid_range',
    description: '',
    itinerary: [] as ItineraryDay[],
    cover_image: '',
    trip_types: [] as string[],
    is_women_only: false,
    status: 'open',
    invite_code: generateInviteCode(),
    settings: {
      privacy: 'public' as 'public' | 'private' | 'invite_only',
      approval_required: true,
      gender_preference: 'any' as 'any' | 'male' | 'female',
      age_group: 'any' as 'any' | '18-25' | '25-35' | '35-50' | '50+',
      show_exact_location: true,
      notification_preferences: {
        new_member: true,
        new_message: true,
        expense_update: true,
      },
    },
  });

  const tripTypeOptions = [
    { label: 'Budget', icon: <IndianRupee className="w-3 h-3" /> },
    { label: 'Adventure', icon: <Mountain className="w-3 h-3" /> },
    { label: 'Trekking', icon: <Backpack className="w-3 h-3" /> },
    { label: 'Nature', icon: <Trees className="w-3 h-3" /> },
    { label: 'Luxury', icon: <Star className="w-3 h-3" /> },
    { label: 'Culture', icon: <Landmark className="w-3 h-3" /> },
    { label: 'Backpacking', icon: <Tent className="w-3 h-3" /> },
    { label: 'Relaxation', icon: <Umbrella className="w-3 h-3" /> },
    { label: 'Foodie', icon: <Utensils className="w-3 h-3" /> }
  ];

  const maxMembersOptions = [
    { value: '2', label: '2 people' },
    { value: '3', label: '3 people' },
    { value: '4', label: '4 people' },
    { value: '5', label: '5 people' },
    { value: '6', label: '6 people' },
    { value: '8', label: '8 people' },
    { value: '10', label: '10 people' },
    { value: '12', label: '12 people' },
    { value: '15', label: '15 people' },
    { value: '20', label: '20 people' },
  ];

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
  ];

  const toggleTripType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      trip_types: prev.trip_types.includes(type)
        ? prev.trip_types.filter(t => t !== type)
        : [...prev.trip_types, type]
    }));
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

  const generateAIDescription = async () => {
    if (!formData.destination_city) {
      toast.error("Please select a destination first!");
      return;
    }
    
    setIsGenerating(true);
    console.log("Generating AI description for:", formData.destination_city);
    try {
      const ai = getGeminiInstance();
      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{
          parts: [{
            text: `Generate a catchy, engaging travel trip description for a trip to ${formData.destination_city}, ${formData.destination_country}. 
            Travel style: ${formData.travel_style}. Trip types: ${formData.trip_types.join(', ')}. 
            Keep it under 150 words. Focus on why someone should join this trip.`
          }]
        }]
      });
      
      const text = result.text;
      if (text) {
        setFormData({ ...formData, description: text });
        toast.success("AI generated a description for you!");
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      const msg = error?.message || "Please try again.";
      toast.error(`Failed to generate description: ${msg}`);
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

    if (diffDays > 10) {
      toast.error("AI generation is limited to 10 days for now.");
      return;
    }

    setIsGenerating(true);
    console.log("Generating AI itinerary for:", formData.destination_city, "Days:", diffDays);
    try {
      const ai = getGeminiInstance();
      const result = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{
          parts: [{
            text: `Generate a day-wise itinerary for a ${diffDays}-day trip to ${formData.destination_city}, ${formData.destination_country}. 
            Travel style: ${formData.travel_style}. Trip types: ${formData.trip_types.join(', ')}. 
            Format the response as a JSON array of objects, each with 'day' (number) and 'activities' (array of strings). 
            IMPORTANT: Return ONLY the JSON array, no other text.
            Example: [{"day": 1, "activities": ["Arrival", "Check-in", "Dinner at local market"]}]`
          }]
        }]
      });
      
      let text = result.text;
      if (!text) throw new Error("No response from AI");
      
      // Clean up JSON response if model included markdown blocks
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
      const msg = error?.message || "Please try again.";
      toast.error(`Failed to generate itinerary: ${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('trip_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(prev => ({ ...prev, ...draft }));
        toast.success("Draft loaded! You can continue where you left off.");
      } catch (e) {
        console.error("Error loading draft", e);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('trip_draft', JSON.stringify(formData));
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [formData]);

  const saveDraftManually = () => {
    localStorage.setItem('trip_draft', JSON.stringify(formData));
    toast.success("Draft saved successfully!");
  };

  const generateAIImage = async () => {
    if (!formData.destination_city) {
      toast.error("Please select a destination first!");
      return;
    }

    setIsGeneratingImage(true);
    console.log("Generating AI image for:", formData.destination_city);
    try {
      const ai = getGeminiInstance();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `A stunning, high-quality travel cover photo for ${formData.destination_city}, ${formData.destination_country}. 
              Cinematic lighting, vibrant colors, professional photography style. 
              No text, no watermarks. Aspect ratio 16:9.`,
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64Data}`;
          setFormData({ ...formData, cover_image: imageUrl });
          toast.success("AI generated a beautiful cover image!");
          return;
        }
      }
      toast.error("Failed to generate image. Please try again.");
    } catch (error: any) {
      console.error("AI Image Generation Error:", error);
      const msg = error?.message || "Please try again.";
      toast.error(`Failed to generate image: ${msg}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.destination_city || formData.destination_lat === 0) {
      toast.error('Please select a valid destination from the suggestions.');
      return;
    }

    setLoading(true);
    try {
      if (!db) throw new Error('Firestore database is not initialized');
      
      const docRef = await addDoc(collection(db, 'trips'), {
        ...formData,
        organizer_id: user.uid,
        organizer_name: profile?.name || user.displayName || 'Organizer',
        organizer_photo_url: profile?.photo_url || user.photoURL || null,
        organizer_verified: profile?.is_verified || false,
        organizer_vibe: profile?.vibe_quiz_results || null,
        budget_max: formData.budget_max,
        max_members: parseInt(formData.max_members),
        current_members: 1,
        invite_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      await setDoc(doc(db, 'trip_members', `${user.uid}_${docRef.id}`), {
        trip_id: docRef.id,
        user_id: user.uid,
        role: 'organizer',
        status: 'approved',
        joined_at: new Date().toISOString(),
      });

      // Clear draft after successful publish
      localStorage.removeItem('trip_draft');

      toast.success("Trip published successfully!");
      navigate(`/trips/${docRef.id}`);
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast.error(error.message || 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.destination_city) return toast.error("Destination is required");
      if (!formData.start_date || !formData.end_date) return toast.error("Dates are required");
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateProgress = () => {
    return (currentStep / 3) * 100;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Main Form Content */}
        <div className="lg:col-span-8">
          <div className="mb-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3 mb-4"
            >
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Create Adventure</h1>
            </motion.div>
            <p className="text-gray-500 font-medium text-lg">Plan your dream trip and find the perfect travel buddies.</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Step {currentStep} of 3</span>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{Math.round(calculateProgress())}% Completed</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${calculateProgress()}%` }}
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg"
              />
            </div>
          </div>

          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-gray-100 relative overflow-visible"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <form onSubmit={handleSubmit} className="relative z-10 space-y-10">
              
              {/* Step 1: Trip Basics */}
              {currentStep === 1 && (
                <div className="space-y-10">
                  <section>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-indigo-50 rounded-xl">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">Trip Basics</h2>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Destination</label>
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
                          placeholder="Where are you planning to go?"
                        />
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
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-purple-50 rounded-xl">
                        <Compass className="w-5 h-5 text-purple-600" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">Travel Style</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CustomSelect
                        label="Travel Style"
                        icon={<Briefcase className="w-4 h-4 text-indigo-600" />}
                        value={formData.travel_style}
                        onChange={(val) => setFormData({ ...formData, travel_style: val })}
                        options={travelStyleOptions}
                      />
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-amber-50 rounded-xl">
                        <Star className="w-5 h-5 text-amber-600" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">Trip Type</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {tripTypeOptions.map(option => (
                        <motion.button
                          key={option.label}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleTripType(option.label)}
                          className={`flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
                            formData.trip_types.includes(option.label)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                              : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md'
                          }`}
                        >
                          {option.icon}
                          <span>{option.label}</span>
                          {formData.trip_types.includes(option.label) && <CheckCircle2 className="w-3 h-3 ml-1" />}
                        </motion.button>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* Step 2: Group & Budget */}
              {currentStep === 2 && (
                <div className="space-y-10">
                  <section>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-emerald-50 rounded-xl">
                        <IndianRupee className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">Budget & Group</h2>
                    </div>
                    <div className="space-y-8">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Max Budget (per person)</label>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-400">₹</span>
                            <input
                              type="number"
                              value={formData.budget_max}
                              onChange={(e) => setFormData({ ...formData, budget_max: parseInt(e.target.value) || 0 })}
                              className="w-24 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>
                        <input
                          type="range"
                          min="1000"
                          max="500000"
                          step="1000"
                          value={formData.budget_max}
                          onChange={(e) => setFormData({ ...formData, budget_max: parseInt(e.target.value) })}
                          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <span>₹1K</span>
                          <span>₹50K</span>
                          <span>₹100K</span>
                          <span>₹500K+</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <CustomSelect
                          label="Max Members"
                          icon={<Users className="w-4 h-4 text-indigo-600" />}
                          value={formData.max_members}
                          onChange={(val) => setFormData({ ...formData, max_members: val })}
                          options={maxMembersOptions}
                        />
                        <CustomSelect
                          label="Trip Status"
                          icon={<Info className="w-4 h-4 text-indigo-600" />}
                          value={formData.status}
                          onChange={(val) => setFormData({ ...formData, status: val })}
                          options={statusOptions}
                        />
                      </div>
                    </div>
                  </section>

                  {profile?.gender === 'female' && (
                    <section>
                      <motion.div 
                        whileHover={{ y: -2 }}
                        className="bg-rose-50 p-8 rounded-3xl border border-rose-100 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-white rounded-2xl shadow-sm">
                            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Women Only Trip</h3>
                            <p className="text-xs text-rose-600 font-medium">Only female travelers will see and join this trip.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.is_women_only}
                            onChange={(e) => setFormData({ ...formData, is_women_only: e.target.checked })}
                            className="sr-only peer" 
                          />
                          <div className="w-14 h-7 bg-rose-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-rose-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                        </label>
                      </motion.div>
                    </section>
                  )}
                </div>
              )}

              {/* Step 3: Details */}
              {currentStep === 3 && (
                <div className="space-y-10">
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-50 rounded-xl">
                          <Layout className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Trip Details</h2>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={generateAIDescription}
                        disabled={isGenerating}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        <span>AI Generate</span>
                      </motion.button>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                        <textarea
                          required
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={6}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:shadow-lg transition-all resize-none"
                          placeholder="What's the plan? Who should join? Any expectations? Describe your dream trip here..."
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2 ml-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Cover Image</label>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={generateAIImage}
                            disabled={isGeneratingImage}
                            className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors disabled:opacity-50"
                          >
                            {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkle className="w-3 h-3" />}
                            <span>✨ AI Generate Image</span>
                          </motion.button>
                        </div>
                        <div className="relative group/image">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/image:text-indigo-500 transition-colors" />
                          <input
                            type="url"
                            value={formData.cover_image}
                            onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                            placeholder="Paste cover image URL (or use AI to generate one)"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-50 rounded-xl">
                          <Map className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Itinerary Builder</h2>
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={generateAIItinerary}
                        disabled={isGenerating}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        <span>AI Planner</span>
                      </motion.button>
                    </div>
                    
                    <div className="space-y-6">
                      <AnimatePresence>
                        {formData.itinerary.map((day, dIdx) => (
                          <motion.div
                            key={dIdx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-gray-50 p-6 rounded-3xl border border-gray-100 relative group"
                          >
                            <button 
                              type="button"
                              onClick={() => removeDay(dIdx)}
                              className="absolute top-4 right-4 p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-center space-x-2 mb-4">
                              <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm border border-gray-100">
                                {day.day}
                              </span>
                              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Day {day.day}</h3>
                            </div>
                            <div className="space-y-3">
                              {day.activities.map((activity, aIdx) => (
                                <div key={aIdx} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={activity}
                                    onChange={(e) => updateActivity(dIdx, aIdx, e.target.value)}
                                    className="flex-1 px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder={`Activity ${aIdx + 1}...`}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => removeActivity(dIdx, aIdx)}
                                    className="p-3 text-gray-300 hover:text-rose-500 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addActivity(dIdx)}
                                className="flex items-center space-x-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors ml-1 mt-2"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Activity</span>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={addItineraryDay}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-sm font-black uppercase tracking-widest">Add Day to Plan</span>
                      </motion.button>
                    </div>
                  </section>

                  <section>
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:bg-gray-50 transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-indigo-50 transition-colors">
                          <Settings className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Advanced Settings</h2>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-8 space-y-8 bg-gray-50/50 border-x border-b border-gray-100 rounded-b-[2.5rem] -mt-6 pt-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Privacy</label>
                                <div className="flex flex-col space-y-3">
                                  {(['public', 'private', 'invite_only'] as const).map(p => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => setFormData({ ...formData, settings: { ...formData.settings, privacy: p } })}
                                      className={`flex items-center justify-between px-6 py-3 rounded-2xl border transition-all ${
                                        formData.settings.privacy === p 
                                          ? 'bg-white border-indigo-600 text-indigo-600 shadow-md' 
                                          : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-200'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        {p === 'public' ? <Globe className="w-4 h-4" /> : p === 'private' ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                        <span className="text-xs font-black uppercase tracking-widest">{p.replace('_', ' ')}</span>
                                      </div>
                                      {formData.settings.privacy === p && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                                  <div className="flex items-center space-x-3">
                                    <UserCheck className="w-5 h-5 text-indigo-600" />
                                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Approval Required</span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={formData.settings.approval_required}
                                      onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, approval_required: e.target.checked } })}
                                      className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                  </label>
                                </div>
                                <div className="space-y-4">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Age Group Preference</label>
                                  <select
                                    value={formData.settings.age_group}
                                    onChange={(e) => setFormData({ ...formData, settings: { ...formData.settings, age_group: e.target.value as any } })}
                                    className="w-full px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                                  >
                                    <option value="any">Any Age</option>
                                    <option value="18-25">18-25</option>
                                    <option value="25-35">25-35</option>
                                    <option value="35-50">35-50</option>
                                    <option value="50+">50+</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-10 border-t border-gray-50">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`flex items-center space-x-2 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                    currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={saveDraftManually}
                    className="px-8 py-4 text-gray-400 hover:text-indigo-600 text-sm font-black uppercase tracking-widest transition-all hidden md:block"
                  >
                    Save Draft
                  </button>
                  {currentStep < 3 ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextStep}
                      className="flex items-center space-x-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  ) : (
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={loading}
                      className="flex items-center space-x-2 px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:shadow-indigo-300 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Plane className="w-5 h-5" />
                          <span>Publish Trip</span>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
              <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Your trip will be visible to travelers instantly after publishing.
              </p>
            </form>
          </motion.div>
        </div>

        {/* Live Preview Panel (Sticky) */}
        <div className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Eye className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Live Preview</h3>
            </div>
            
            <motion.div 
              layout
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-100/50 border border-gray-100 group"
            >
              <div className="relative h-56 bg-gray-100 overflow-hidden">
                {formData.cover_image ? (
                  <img src={formData.cover_image} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                    <Plane className="w-12 h-12 text-indigo-200 animate-pulse" />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">
                    {formData.travel_style.replace('_', ' ')}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                  <h4 className="text-white font-black text-2xl tracking-tight truncate">
                    {formData.destination_city || 'Your Destination'}
                  </h4>
                  <div className="flex items-center text-white/80 text-xs font-bold mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {formData.destination_country}
                  </div>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</p>
                      <p className="text-xs font-black text-gray-900">
                        {formData.start_date ? new Date(formData.start_date).toLocaleDateString() : 'Start'} - {formData.end_date ? new Date(formData.end_date).toLocaleDateString() : 'End'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget</p>
                    <p className="text-lg font-black text-indigo-600">₹{formData.budget_max.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-2xl">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-600">{formData.max_members} Members Max</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.trip_types.length > 0 ? (
                    formData.trip_types.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-bold text-gray-300 italic">No tags selected</span>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden">
                      {profile?.photo_url ? <img src={profile.photo_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-2 text-gray-400" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Organizer</p>
                      <p className="text-xs font-bold text-gray-900">{profile?.name || 'You'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200">
              <div className="flex items-center space-x-3 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <h4 className="font-black text-sm uppercase tracking-widest">Pro Tip</h4>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                Trips with detailed itineraries and clear descriptions get 3x more join requests. Use our AI assistant to polish your plan!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
