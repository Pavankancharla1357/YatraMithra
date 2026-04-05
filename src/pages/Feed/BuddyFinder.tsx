import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Send, User, Sparkles, Users, MessageSquare, Heart, Star, Info, Filter, ChevronDown, Plus, X, Bookmark, Share2, MoreHorizontal, Search } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Link, useNavigate } from 'react-router-dom';
import { getAiBuddyRecommendations, BuddyMatch } from '../../services/geminiBuddyService';
import { toast } from 'sonner';

interface BuddyPost {
  id: string;
  user_id: string;
  user_name: string;
  user_photo_url?: string | null;
  title?: string;
  content: string;
  location?: string;
  dates?: string;
  group_type?: string;
  tags?: string[];
  interested_count?: number;
  is_active?: boolean;
  created_at?: any;
}

export const BuddyFinder: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BuddyPost[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [aiMatches, setAiMatches] = useState<BuddyMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const getNextWeekend = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysUntilFriday);
    
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    
    return {
      start: friday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    location: '',
    startDate: getNextWeekend().start,
    endDate: getNextWeekend().end,
    group_type: 'Open to all',
    tags: [] as string[]
  });
  const [filters, setFilters] = useState({
    location: '',
    date: '',
    gender: 'Any',
    tripType: 'Any'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const POPULAR_DESTINATIONS = [
    'Goa', 'Manali', 'Leh Ladakh', 'Rishikesh', 'Udaipur', 'Jaipur', 'Kerala', 'Sikkim', 'Andaman', 'Pondicherry', 'Munnar', 'Coorg', 'Varanasi', 'Hampi', 'Gokarna'
  ];

  const validateField = (name: string, value: any) => {
    let error = '';
    const today = new Date().toISOString().split('T')[0];

    switch (name) {
      case 'title':
        if (!value.trim()) error = 'Trip title is required';
        else if (value.length < 5) error = 'Title is too short';
        break;
      case 'content':
        if (!value.trim()) error = 'Please describe your plan';
        else if (value.length < 20) error = 'Description should be at least 20 characters';
        break;
      case 'location':
        if (!value.trim()) error = 'Where are you going?';
        break;
      case 'startDate':
        if (!value) error = 'Start date is required';
        else if (value < today) error = 'Start date cannot be in the past';
        break;
      case 'endDate':
        if (!value) error = 'End date is required';
        else if (newPost.startDate && value < newPost.startDate) error = 'End date must be after start date';
        break;
    }

    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const isFormValid = () => {
    return (
      newPost.title.trim() &&
      newPost.content.trim() &&
      newPost.location.trim() &&
      newPost.startDate &&
      newPost.endDate &&
      !Object.values(errors).some(err => err)
    );
  };
  const [showFilters, setShowFilters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'nearby' | 'trending'>('all');

  useEffect(() => {
    const q = query(collection(db, 'buddy_posts'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BuddyPost));
      setPosts(newPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'buddy_posts');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAiMatches = async () => {
      if (!profile || aiMatches.length > 0) return;
      setLoadingMatches(true);
      try {
        const recommendations = await getAiBuddyRecommendations(profile);
        setAiMatches(recommendations);
      } catch (err) {
        console.error('Error fetching AI matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchAiMatches();
  }, [profile]);

  useEffect(() => {
    const fetchMissingProfiles = async () => {
      if (posts.length === 0) return;
      
      const uniqueUserIds = Array.from(new Set(posts.map(p => p.user_id)));
      const missingIds = uniqueUserIds.filter(id => !userProfiles[id]);

      if (missingIds.length > 0) {
        const profilesToFetch = [...missingIds];
        const newProfiles: Record<string, any> = {};
        
        await Promise.all(profilesToFetch.map(async (uid) => {
          try {
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
            if (!userDoc.empty) {
              newProfiles[uid] = userDoc.docs[0].data();
            }
          } catch (err) {
            console.error(`Error fetching profile for ${uid}:`, err);
          }
        }));

        if (Object.keys(newProfiles).length > 0) {
          setUserProfiles(prev => ({ ...prev, ...newProfiles }));
        }
      }
    };
    fetchMissingProfiles();
  }, [posts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isFormValid()) return;

    setIsSubmitting(true);
    try {
      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      };

      const dateRange = `${formatDate(newPost.startDate)} – ${formatDate(newPost.endDate)}`;

      await addDoc(collection(db, 'buddy_posts'), {
        user_id: user.uid,
        user_name: profile?.name || user.displayName || 'Traveler',
        user_photo_url: profile?.photo_url || user.photoURL || null,
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        location: newPost.location.trim(),
        dates: dateRange,
        group_type: newPost.group_type,
        tags: newPost.tags,
        interested_count: 0,
        is_active: true,
        created_at: serverTimestamp()
      });
      const nextWeekend = getNextWeekend();
      setNewPost({ 
        title: '', 
        content: '', 
        location: '', 
        startDate: nextWeekend.start, 
        endDate: nextWeekend.end, 
        group_type: 'Open to all', 
        tags: [] 
      });
      setErrors({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'buddy_posts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterest = async (postId: string, currentCount: number) => {
    if (!user) return;
    try {
      const postRef = doc(db, 'buddy_posts', postId);
      await updateDoc(postRef, {
        interested_count: (currentCount || 0) + 1
      });
    } catch (error) {
      console.error('Error updating interest:', error);
    }
  };

  const handleMessage = async (targetUserId: string, targetName: string, context?: string) => {
    if (!user || user.uid === targetUserId) return;

    try {
      // Check connection status first
      const connId = [user.uid, targetUserId].sort().join('_');
      const connSnap = await getDoc(doc(db, 'connections', connId));
      const connection = connSnap.exists() ? connSnap.data() : null;

      if (!connection || connection.status !== 'accepted') {
        toast.error(`You must be connected with ${targetName} to message them.`, {
          action: {
            label: 'View Profile',
            onClick: () => navigate(`/profile/${targetUserId}`)
          }
        });
        return;
      }

      // Check if a direct channel already exists
      const q = query(
        collection(db, 'channels'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingChannel = snapshot.docs.find(doc => 
        doc.data().participants.includes(targetUserId)
      );

      if (existingChannel) {
        // Clear deleted flag if it exists
        await setDoc(doc(db, 'users', user.uid, 'chat_settings', existingChannel.id), { 
          deleted: false 
        }, { merge: true });
        
        // Update last message time to bring it to top
        await updateDoc(doc(db, 'channels', existingChannel.id), {
          last_message_time: serverTimestamp()
        });
        
        navigate(`/messages/${existingChannel.id}`);
      } else {
        // Create new channel
        const newChannelRef = await addDoc(collection(db, 'channels'), {
          type: 'direct',
          participants: [user.uid, targetUserId],
          last_message_time: serverTimestamp(),
          last_message: context ? `Started a conversation about: ${context.substring(0, 30)}...` : `Started a conversation`
        });
        
        // Send initial system message
        await addDoc(collection(db, 'messages'), {
          channel_id: newChannelRef.id,
          sender_id: 'system',
          sender_name: 'YatraMitra Bot',
          content: context 
            ? `👋 Hi! ${profile?.name || 'Someone'} is interested in your post: "${context.substring(0, 50)}..."`
            : `👋 Hi! ${profile?.name || 'Someone'} wants to connect with you.`,
          message_type: 'system',
          created_at: serverTimestamp()
        });

        navigate(`/messages/${newChannelRef.id}`);
      }
    } catch (error) {
      console.error('Error initiating chat:', error);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesLocation = !filters.location || post.location?.toLowerCase().includes(filters.location.toLowerCase());
    const matchesTripType = filters.tripType === 'Any' || post.group_type === filters.tripType;
    // Add more filter logic as needed
    return matchesLocation && matchesTripType;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FD] pb-24">
      {/* Hero Section */}
      <div className="relative bg-indigo-600 pt-32 pb-48 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="rgba(255,255,255,0.05)" />
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-xs font-bold mb-6 border border-white/20"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Find your perfect travel squad</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6"
          >
            Adventure is better <br /> <span className="text-indigo-200">together.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-indigo-100 max-w-2xl mx-auto font-medium"
          >
            Connect with like-minded travelers, share your plans, and create memories that last a lifetime.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Create Travel Plan Form */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/50 border border-gray-100">
              <div className="flex items-center space-x-3 mb-8">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <Plus className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create Travel Plan</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Trip Title & Content */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 ml-1">Trip Title / Plan</label>
                    <div className={`relative group/input transition-all duration-300 ${errors.title ? 'ring-2 ring-red-500 bg-red-50/10' : 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-indigo-50/30'}`}>
                      <input
                        type="text"
                        value={newPost.title}
                        onChange={(e) => {
                          setNewPost({ ...newPost, title: e.target.value });
                          validateField('title', e.target.value);
                        }}
                        placeholder="e.g. Weekend getaway to Rishikesh"
                        className="w-full text-xl font-bold text-gray-900 placeholder-gray-300 border border-gray-100 rounded-2xl px-6 py-4 bg-gray-50 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                    {errors.title && <p className="text-xs font-bold text-red-500 ml-1">{errors.title}</p>}
                    <p className="text-[10px] font-bold text-gray-400 ml-1">A catchy title helps attract more travel buddies</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 ml-1">Plan Details</label>
                    <div className={`relative group/input transition-all duration-300 ${errors.content ? 'ring-2 ring-red-500 bg-red-50/10' : 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-indigo-50/30'}`}>
                      <textarea
                        value={newPost.content}
                        onChange={(e) => {
                          setNewPost({ ...newPost, content: e.target.value });
                          validateField('content', e.target.value);
                        }}
                        placeholder="Describe your itinerary, preferred activities, and what kind of buddy you're looking for..."
                        className="w-full text-gray-600 placeholder-gray-300 border border-gray-100 rounded-2xl px-6 py-4 bg-gray-50 focus:bg-white focus:border-indigo-200 outline-none transition-all resize-none min-h-[120px] font-medium"
                      />
                    </div>
                    {errors.content && <p className="text-xs font-bold text-red-500 ml-1">{errors.content}</p>}
                    <p className="text-[10px] font-bold text-gray-400 ml-1">This helps us find better travel matches</p>
                  </div>
                </div>

                {/* Location & Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <label className="text-sm font-black text-gray-700 ml-1">Where are you going?</label>
                    <div className={`relative group/input transition-all duration-300 ${errors.location ? 'ring-2 ring-red-500 bg-red-50/10' : 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-indigo-50/30'}`}>
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-indigo-500 transition-colors" />
                      <input
                        type="text"
                        value={newPost.location}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewPost({ ...newPost, location: val });
                          validateField('location', val);
                          const filtered = POPULAR_DESTINATIONS.filter(d => d.toLowerCase().includes(val.toLowerCase()));
                          setLocationSuggestions(filtered);
                        }}
                        placeholder="e.g. Goa, Manali"
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-indigo-200 transition-all"
                      />
                    </div>
                    {errors.location && <p className="text-xs font-bold text-red-500 ml-1">{errors.location}</p>}
                    
                    <AnimatePresence>
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                          {locationSuggestions.map(dest => (
                            <button
                              key={dest}
                              type="button"
                              onClick={() => {
                                setNewPost({ ...newPost, location: dest });
                                setErrors(prev => ({ ...prev, location: '' }));
                                setShowSuggestions(false);
                              }}
                              className="w-full px-6 py-3 text-left text-sm font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center space-x-3"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{dest}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 ml-1">Date Range</label>
                    <div className="flex items-center space-x-2">
                      <div className={`flex-1 relative group/input transition-all duration-300 ${errors.startDate ? 'ring-2 ring-red-500 bg-red-50/10' : 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-indigo-50/30'}`}>
                        <input
                          type="date"
                          value={newPost.startDate}
                          onKeyDown={(e) => e.preventDefault()}
                          onChange={(e) => {
                            setNewPost({ ...newPost, startDate: e.target.value });
                            validateField('startDate', e.target.value);
                          }}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 outline-none focus:bg-white focus:border-indigo-200 transition-all"
                        />
                      </div>
                      <span className="text-gray-400 font-bold">to</span>
                      <div className={`flex-1 relative group/input transition-all duration-300 ${errors.endDate ? 'ring-2 ring-red-500 bg-red-50/10' : 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-indigo-50/30'}`}>
                        <input
                          type="date"
                          value={newPost.endDate}
                          min={newPost.startDate}
                          onKeyDown={(e) => e.preventDefault()}
                          onChange={(e) => {
                            setNewPost({ ...newPost, endDate: e.target.value });
                            validateField('endDate', e.target.value);
                          }}
                          className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-700 outline-none focus:bg-white focus:border-indigo-200 transition-all"
                        />
                      </div>
                    </div>
                    {(errors.startDate || errors.endDate) && (
                      <p className="text-xs font-bold text-red-500 ml-1">{errors.startDate || errors.endDate}</p>
                    )}
                  </div>
                </div>

                {/* Group Type & Tags */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 ml-1">Group Type</label>
                    <div className="relative group/select">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover/select:text-indigo-500 transition-colors" />
                      <select
                        value={newPost.group_type}
                        onChange={(e) => setNewPost({ ...newPost, group_type: e.target.value })}
                        className="w-full pl-12 pr-10 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-200 appearance-none transition-all duration-300"
                      >
                        <option value="Open to all">Open to all</option>
                        <option value="Solo">Solo</option>
                        <option value="Couples">Couples</option>
                        <option value="Friends">Friends</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover/select:text-indigo-500 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 ml-1">Tags / Interests</label>
                    <div className="flex flex-wrap gap-2">
                      {['Adventure', 'Budget', 'Luxury', 'Nature', 'Culture', 'Foodie'].map(tag => (
                        <motion.button
                          key={tag}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const tags = newPost.tags.includes(tag)
                              ? newPost.tags.filter(t => t !== tag)
                              : [...newPost.tags, tag];
                            setNewPost({ ...newPost, tags });
                          }}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            newPost.tags.includes(tag) 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                          }`}
                        >
                          {tag}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <motion.button
                    type="submit"
                    whileHover={isFormValid() ? { scale: 1.01, y: -2 } : {}}
                    whileTap={isFormValid() ? { scale: 0.99 } : {}}
                    disabled={isSubmitting || !isFormValid()}
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Post Travel Plan</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>

            {/* Filter Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-4 shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-1 p-1 bg-gray-50 rounded-2xl">
                {(['all', 'nearby', 'trending'] as const).map(tab => (
                  <motion.button
                    key={tab}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                      activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab}
                  </motion.button>
                ))}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="relative group/filter">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-hover/filter:text-indigo-500 transition-colors" />
                  <select
                    value={filters.tripType}
                    onChange={(e) => setFilters({ ...filters, tripType: e.target.value })}
                    className="pl-8 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500 hover:bg-white hover:shadow-md focus:bg-white focus:shadow-lg outline-none appearance-none transition-all duration-300"
                  >
                    <option value="Any">All Types</option>
                    <option value="Solo">Solo</option>
                    <option value="Couple">Couple</option>
                    <option value="Small Group">Small Group</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none group-hover/filter:text-indigo-500 transition-colors" />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition-all duration-300 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md'}`}
                >
                  <Search className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -10 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Location</label>
                      <div className="relative group/input">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-focus-within/input:text-indigo-500 transition-colors" />
                        <input
                          type="text"
                          value={filters.location}
                          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                          placeholder="Search city..."
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:shadow-md transition-all duration-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender Pref</label>
                      <div className="relative group/select">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-hover/select:text-indigo-500 transition-colors" />
                        <select
                          value={filters.gender}
                          onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                          className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:shadow-md appearance-none transition-all duration-300"
                        >
                          <option value="Any">Any</option>
                          <option value="Male">Male Only</option>
                          <option value="Female">Female Only</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none group-hover/select:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date Range</label>
                      <div className="relative group/input">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-focus-within/input:text-indigo-500 transition-colors" />
                        <input
                          type="date"
                          value={filters.date}
                          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:shadow-md transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feed */}
            <div className="space-y-4">
              <AnimatePresence>
                {filteredPosts.map((post) => {
                  const postProfile = userProfiles[post.user_id];
                  const photoUrl = postProfile?.photo_url || post.user_photo_url;
                  const userName = postProfile?.name || post.user_name;

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -2 }}
                      className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 group transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Link to={`/profile/${post.user_id}`} className="relative">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center overflow-hidden border border-white shadow-sm">
                              {photoUrl ? (
                                <img src={photoUrl} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-5 h-5 text-indigo-600" />
                              )}
                            </div>
                          </Link>
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <Link to={`/profile/${post.user_id}`} className="font-bold text-sm text-gray-900 hover:text-indigo-600 transition-colors">
                                {userName}
                              </Link>
                              <span className="text-[10px] text-gray-400 font-medium">
                                • {post.created_at?.toDate ? new Date(post.created_at.toDate()).toLocaleDateString() : 'Just now'}
                              </span>
                            </div>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                              {post.group_type || 'Traveler'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        {post.title && (
                          <h3 className="text-base font-bold text-gray-900 mb-1 tracking-tight">
                            {post.title}
                          </h3>
                        )}
                        <p className="text-gray-600 leading-snug font-medium text-sm line-clamp-2">
                          {post.content}
                        </p>
                      </div>

                      {/* Inline Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4 text-[11px] text-gray-500 font-medium">
                        {post.location && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-indigo-400" />
                            {post.location}
                          </div>
                        )}
                        {post.dates && (
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-emerald-400" />
                            {post.dates}
                          </div>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-300">|</span>
                            {post.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md border border-gray-100 text-[9px] uppercase tracking-tighter">
                                {tag}
                              </span>
                            ))}
                            {post.tags.length > 2 && <span className="text-[9px] text-gray-300">+{post.tags.length - 2}</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex items-center space-x-4">
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleInterest(post.id, post.interested_count || 0)}
                            className="flex items-center space-x-1.5 text-gray-400 hover:text-rose-500 transition-all group/heart"
                          >
                            <div className={`p-1.5 rounded-lg transition-all ${post.interested_count ? 'bg-rose-50 text-rose-500' : 'group-hover:bg-rose-50'}`}>
                              <Heart className={`w-4 h-4 ${post.interested_count ? 'fill-rose-500' : ''}`} />
                            </div>
                            <span className={`text-xs font-bold ${post.interested_count ? 'text-rose-600' : ''}`}>{post.interested_count || 0}</span>
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMessage(post.user_id, userName, post.content)}
                            className="flex items-center space-x-1.5 text-gray-400 hover:text-indigo-600 transition-all group/msg"
                          >
                            <div className="p-1.5 rounded-lg group-hover:bg-indigo-50 transition-all">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold">Message</span>
                          </motion.button>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <Bookmark className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* AI Recommendations Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100/50 border border-gray-100 sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Smart Matches</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by Gemini AI</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-8">
                {loadingMatches ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-100 rounded w-3/4" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-20 bg-gray-50 rounded-2xl" />
                    </div>
                  ))
                ) : aiMatches.length > 0 ? (
                  aiMatches.map((match) => (
                    <motion.div 
                      key={match.uid} 
                      whileHover={{ scale: 1.02 }}
                      className="relative p-6 bg-gray-50 rounded-[2rem] border border-gray-100 group transition-all"
                    >
                      <div className="flex items-start space-x-4 mb-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-md border-2 border-white">
                            {match.photo_url ? (
                              <img src={match.photo_url} alt={match.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-8 h-8 text-indigo-600" />
                            )}
                          </div>
                          <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[8px] font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                            {match.compatibilityScore}%
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-gray-900 text-lg truncate">{match.name}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {match.commonInterests.slice(0, 2).map(interest => (
                              <span key={interest} className="text-[8px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-50">
                        <div className="flex items-center space-x-2 mb-2">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Why this match</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed font-medium italic">
                          "{match.reasoning}"
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate(`/profile/${match.uid}`)}
                          className="py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 hover:border-indigo-200 hover:text-indigo-600 transition-all duration-300"
                        >
                          Profile
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleMessage(match.uid, match.name)}
                          className="py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 transition-all duration-300"
                        >
                          Message
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No matches yet</p>
                    <button 
                      onClick={() => navigate('/profile')}
                      className="mt-4 text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Update Interests
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
