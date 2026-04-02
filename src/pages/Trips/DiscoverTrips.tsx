import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, where, orderBy, limit, getCountFromServer, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { TripCard } from '../../components/Trips/TripCard';
import { Search, Filter, MapPin, Calendar as CalendarIcon, SlidersHorizontal, Compass, Plane, X, Plus, ChevronDown, History, TrendingUp, CheckCircle2, Heart, Zap, Star, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/Auth/AuthContext';
import { toast } from 'sonner';
import { CustomSelect } from '../../components/UI/CustomSelect';
import { CustomDatePicker } from '../../components/UI/CustomDatePicker';
import { Skeleton } from '../../components/UI/Skeleton';
import { Capacitor } from '@capacitor/core';

export const DiscoverTrips: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('trending');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(JSON.parse(localStorage.getItem('recentSearches') || '[]'));
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState('');
  const [filters, setFilters] = useState({
    startDate: searchParams.get('date') || '',
    endDate: '',
    maxBudget: 100000,
    minGroupSize: 1,
    maxGroupSize: 20,
    travelStyle: '',
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByNearby, setSortByNearby] = useState(false);

  const [userCount, setUserCount] = useState<number>(0);
  const [isSeeding, setIsSeeding] = useState(false);

  const isAdmin = profile?.email === 'pavankancharla1357@gmail.com';

  const seedSampleTrips = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const sampleTrips = [
        {
          organizer_id: user.uid,
          organizer_name: profile?.name || 'Admin',
          organizer_photo_url: profile?.photo_url || '',
          destination_city: 'Manali',
          destination_country: 'India',
          start_date: '2026-05-10',
          end_date: '2026-05-15',
          budget_max: 15000,
          max_members: 6,
          current_members: 1,
          travel_style: 'adventure',
          description: 'Exploring the mountains of Manali. Trekking, river rafting and more!',
          status: 'open',
          settings: { privacy: 'public', approval_required: true, show_exact_location: true, notification_preferences: { new_member: true, new_message: true, expense_update: true } },
          created_at: new Date().toISOString(),
          trip_types: ['Adventure', 'Trekking']
        },
        {
          organizer_id: user.uid,
          organizer_name: profile?.name || 'Admin',
          organizer_photo_url: profile?.photo_url || '',
          destination_city: 'Goa',
          destination_country: 'India',
          start_date: '2026-06-01',
          end_date: '2026-06-05',
          budget_max: 12000,
          max_members: 8,
          current_members: 1,
          travel_style: 'relaxation',
          description: 'Beach vibes and sunset parties in North Goa.',
          status: 'open',
          settings: { privacy: 'public', approval_required: false, show_exact_location: true, notification_preferences: { new_member: true, new_message: true, expense_update: true } },
          created_at: new Date().toISOString(),
          trip_types: ['Relaxation', 'Foodie']
        },
        {
          organizer_id: user.uid,
          organizer_name: profile?.name || 'Admin',
          organizer_photo_url: profile?.photo_url || '',
          destination_city: 'Ladakh',
          destination_country: 'India',
          start_date: '2026-07-15',
          end_date: '2026-07-25',
          budget_max: 35000,
          max_members: 4,
          current_members: 1,
          travel_style: 'adventure',
          description: 'The ultimate road trip to the land of high passes.',
          status: 'open',
          settings: { privacy: 'public', approval_required: true, show_exact_location: true, notification_preferences: { new_member: true, new_message: true, expense_update: true } },
          created_at: new Date().toISOString(),
          trip_types: ['Adventure', 'Nature']
        }
      ];

      for (const tripData of sampleTrips) {
        await addDoc(collection(db, 'trips'), tripData);
      }
      toast.success("Sample trips seeded successfully!");
      fetchTrips();
    } catch (e) {
      console.error("Error seeding trips:", e);
      toast.error("Failed to seed trips");
    } finally {
      setIsSeeding(false);
    }
  };

  const placeholders = useMemo(() => {
    if (trips.length === 0) return [
      "Search Goa, Manali, Ladakh...",
      "Looking for Trekking adventures?",
      "Find Budget trips under 10k...",
      "Discover Luxury getaways...",
      "Explore Nature with your tribe..."
    ];
    
    const destinations = Array.from(new Set(trips.map(t => t.destination_city).filter(Boolean))).slice(0, 3);
    const types = Array.from(new Set(trips.flatMap(t => t.trip_types || []))).slice(0, 2);
    
    return [
      `Search ${destinations.join(', ')}...`,
      `Looking for ${types[0] || 'Trekking'} adventures?`,
      "Find Budget trips under 10k...",
      "Discover Luxury getaways...",
      "Explore Nature with your tribe..."
    ];
  }, [trips]);

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, 'users'));
        setUserCount(snapshot.data().count);
      } catch (e) {
        console.error("Error fetching user count:", e);
      }
    };
    fetchUserCount();
  }, []);

  useEffect(() => {
    let currentText = "";
    let isDeleting = false;
    let charIndex = 0;
    let timer: NodeJS.Timeout;

    const type = () => {
      const fullText = placeholders[placeholderIndex];
      
      if (isDeleting) {
        currentText = fullText.substring(0, charIndex - 1);
        charIndex--;
      } else {
        currentText = fullText.substring(0, charIndex + 1);
        charIndex++;
      }

      setPlaceholderText(currentText);

      let typeSpeed = isDeleting ? 50 : 100;

      if (!isDeleting && charIndex === fullText.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        typeSpeed = 500;
      }

      timer = setTimeout(type, typeSpeed);
    };

    timer = setTimeout(type, 1000);
    return () => clearTimeout(timer);
  }, [placeholderIndex]);

  const handleSearchSubmit = (term: string) => {
    if (!term.trim()) return;
    const updatedSearches = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    setSearchTerm(term);
    setIsSearchFocused(false);
  };
  
  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      let querySnapshot;
      
      if (user) {
        // Strategy 1: Try to fetch all trips (works if all are public or user is admin)
        const qAll = query(collection(db, 'trips'), limit(100));
        try {
          querySnapshot = await getDocs(qAll);
        } catch (permissionError: any) {
          // If it's a permission error, try public only
          if (permissionError.code === 'permission-denied') {
            console.log('Permission denied for all trips, fetching public only...');
            const qPublic = query(
              collection(db, 'trips'),
              where('settings.privacy', '==', 'public'),
              limit(100)
            );
            querySnapshot = await getDocs(qPublic);
          } else {
            throw permissionError;
          }
        }
      } else {
        // Unauthenticated: fetch public only
        console.log('Unauthenticated user, fetching public trips only...');
        const qPublic = query(
          collection(db, 'trips'),
          where('settings.privacy', 'in', ['public', 'invite_only']),
          limit(100)
        );
        querySnapshot = await getDocs(qPublic);
      }

      if (!querySnapshot) {
        throw new Error('Failed to fetch trips');
      }

      const tripsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side by created_at desc
      tripsData.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      
      setTrips(tripsData);
    } catch (err: any) {
      console.error('Error fetching trips:', err);
      setError(err.message || 'Failed to fetch trips. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("Error getting location:", error)
      );
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const travelStyleOptions = [
    { value: '', label: 'All Styles' },
    { value: 'budget', label: 'Budget' },
    { value: 'mid_range', label: 'Mid-Range' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'backpacking', label: 'Backpacking' },
  ];

  useEffect(() => {
    fetchTrips();
  }, [user]);

  const calculateCompatibility = (trip: any) => {
    if (!profile?.vibe_quiz_results || !trip.organizer_vibe) return null;
    const userVibe = profile.vibe_quiz_results;
    const organizerVibe = trip.organizer_vibe;
    let score = 0;
    let total = 0;
    Object.keys(userVibe).forEach(key => {
      if (organizerVibe[key]) {
        const diff = Math.abs(userVibe[key] - organizerVibe[key]);
        score += (5 - diff);
        total += 5;
      }
    });
    return total > 0 ? Math.round((score / total) * 100) : null;
  };

  const filteredTrips = trips.filter(trip => {
    // Client-side privacy filter (backup to security rules)
    if (trip.settings?.privacy === 'private' && trip.organizer_id !== user?.uid) {
      return false;
    }

    // Status filter (treat missing status as 'open' for legacy data)
    const status = (trip.status || 'open').toLowerCase();
    if (status !== 'open' && status !== 'active') return false;

    const matchesSearch = (trip.destination_city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (trip.destination_country?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      (trip.trip_types && selectedTags.every(tag => trip.trip_types.includes(tag)));
    
    const matchesStartDate = !filters.startDate || (trip.start_date && new Date(trip.start_date) >= new Date(filters.startDate));
    const matchesEndDate = !filters.endDate || (trip.end_date && new Date(trip.end_date) <= new Date(filters.endDate));
    
    // Relaxed budget check: if no budget specified, it matches any budget filter
    const matchesBudget = !trip.budget_max || trip.budget_max <= filters.maxBudget;
    
    // Relaxed group size check: if no max_members specified, it defaults to 20
    const matchesGroupSize = (trip.max_members || 20) <= filters.maxGroupSize;
    
    const matchesStyle = !filters.travelStyle || trip.travel_style === filters.travelStyle;

    return matchesSearch && matchesTags && matchesStartDate && matchesEndDate && matchesBudget && matchesStyle && matchesGroupSize;
  }).sort((a, b) => {
    if (sortByNearby && userLocation && a.destination_lat && b.destination_lat) {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.destination_lat, a.destination_lng);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.destination_lat, b.destination_lng);
      return distA - distB;
    }

    if (sortBy === 'budget_low') {
      return (a.budget_max || 0) - (b.budget_max || 0);
    }
    if (sortBy === 'match') {
      const matchA = calculateCompatibility(a) || 0;
      const matchB = calculateCompatibility(b) || 0;
      return matchB - matchA;
    }
    if (sortBy === 'recent') {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    }
    // Default: Trending (by current members / max members ratio)
    const ratioA = (a.current_members || 0) / (a.max_members || 1);
    const ratioB = (b.current_members || 0) / (b.max_members || 1);
    return ratioB - ratioA;
  });

  const tags = [
    { name: 'Budget', icon: '💰' },
    { name: 'Adventure', icon: '🧗' },
    { name: 'Trekking', icon: '🏔' },
    { name: 'Nature', icon: '🌲' },
    { name: 'Luxury', icon: '💎' },
    { name: 'Culture', icon: '🕌' },
    { name: 'Backpacking', icon: '🎒' },
    { name: 'Relaxation', icon: '🌴' },
    { name: 'Foodie', icon: '🍜' }
  ];

  const trendingDestinations = useMemo(() => {
    const counts: Record<string, number> = {};
    trips.forEach(trip => {
      if (trip.destination_city) {
        counts[trip.destination_city] = (counts[trip.destination_city] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
    
    return sorted.length > 0 ? sorted : ['Goa', 'Manali', 'Ladakh', 'Rishikesh', 'Udaipur'];
  }, [trips]);

  const recommendedTrips = filteredTrips.filter(t => calculateCompatibility(t) && calculateCompatibility(t)! >= 80).slice(0, 3);
  const nearbyTrips = filteredTrips.filter(t => userLocation && t.destination_lat && calculateDistance(userLocation.lat, userLocation.lng, t.destination_lat, t.destination_lng) < 500).slice(0, 3);
  
  const weekendGetaways = trips.filter(t => {
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const day = start.getDay(); // 5 = Friday, 6 = Saturday
    return duration <= 3 && (day === 5 || day === 6);
  }).slice(0, 3);

  const adventurePicks = trips.filter(t => 
    t.trip_types?.some((type: string) => ['Adventure', 'Trekking'].includes(type))
  ).slice(0, 3);

  const budgetPicks = trips.filter(t => t.budget_max <= 5000).slice(0, 3);

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header / Hero Section */}
      <div className={`relative bg-gray-900 pt-32 pb-24 ${isAndroid ? 'sticky top-0 z-40' : ''} ${isSearchFocused ? 'z-50' : 'z-10'}`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-147758745883-47145ed94245?auto=format&fit=crop&w=1920&q=80" 
            alt="Background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900/60 to-gray-900" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_50%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {isAdmin && (
                  <button
                    onClick={seedSampleTrips}
                    disabled={isSeeding}
                    className="mb-4 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/30 hover:bg-indigo-500/30 transition-all flex items-center gap-2"
                  >
                    {isSeeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Seed Sample Trips (Admin)
                  </button>
                )}
                <span className="inline-flex items-center px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase bg-indigo-400/10 rounded-full border border-indigo-400/20">
                  <Compass className="w-3 h-3 mr-2" /> Explore India
                </span>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
                  Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Adventures</span>
                </h1>
                <p className="text-gray-400 text-xl font-medium max-w-xl mx-auto lg:mx-0">
                  Find your next travel tribe, explore hidden gems, and create memories that last a lifetime.
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-colors" />
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-white tracking-tight">200+ Trips</div>
                    <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">Happening right now</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-gray-300 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Verified Organizers</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-300 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Secure Payments</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-300 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>100% Match Guarantee</span>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map(i => (
                      <img 
                        key={i}
                        src={`https://i.pravatar.cc/150?u=${i}`} 
                        className="w-10 h-10 rounded-full border-2 border-gray-900 shadow-xl" 
                        alt="User"
                      />
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-gray-900 bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                      +{userCount > 1000 ? (userCount / 1000).toFixed(1) + 'k' : userCount}
                    </div>
                  </div>
                  <Link to="/trips/create" className="text-indigo-400 font-black text-sm hover:text-indigo-300 transition-colors flex items-center">
                    Start Hosting <Plus className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
          
          <div className="max-w-5xl mx-auto relative">
            <div className={`bg-white/10 backdrop-blur-2xl p-2 rounded-[2.5rem] border border-white/20 shadow-2xl flex flex-col md:flex-row items-center gap-2 transition-all duration-300 ${isSearchFocused ? 'ring-4 ring-indigo-500/20 border-white/30' : ''}`}>
              <div className="flex-1 w-full flex items-center px-8 py-5 gap-4 border-b md:border-b-0 md:border-r border-white/10 relative">
                <Search className={`w-6 h-6 shrink-0 transition-colors ${isSearchFocused ? 'text-indigo-400' : 'text-gray-400'}`} />
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={placeholderText}
                    value={searchTerm}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchTerm)}
                    className="bg-transparent border-none outline-none text-white placeholder-gray-500 w-full font-bold text-xl"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto p-1">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex-1 md:flex-none flex items-center justify-center px-8 py-5 rounded-[1.5rem] font-black transition-all text-sm ${
                    showFilters ? 'bg-white text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </button>
                <button 
                  onClick={() => handleSearchSubmit(searchTerm)}
                  className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[1.5rem] font-black text-sm hover:shadow-2xl hover:shadow-indigo-500/40 transition-all active:scale-95"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-gray-900/95 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-3xl z-50 overflow-hidden"
                >
                  <div className="p-8">
                    {recentSearches.length > 0 && (
                      <div className="mb-8">
                        <div className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">
                          <History className="w-3 h-3 mr-2" /> Recent Searches
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {recentSearches.map(search => (
                            <button 
                              key={search}
                              onClick={() => handleSearchSubmit(search)}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-gray-300 transition-colors"
                            >
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">
                        <TrendingUp className="w-3 h-3 mr-2" /> Trending Destinations
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {trendingDestinations.map(dest => (
                          <button 
                            key={dest}
                            onClick={() => handleSearchSubmit(dest)}
                            className="flex items-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-left transition-all group"
                          >
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mr-4 group-hover:bg-indigo-500/40 transition-colors">
                              <MapPin className="w-5 h-5 text-indigo-400" />
                            </div>
                            <span className="font-bold text-white">{dest}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 text-center">
                    <button 
                      onClick={() => setIsSearchFocused(false)}
                      className="text-xs font-black text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                    >
                      Close Search
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-gray-100 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full lg:w-auto pb-2 lg:pb-0">
              <button 
                onClick={() => {
                  setSelectedTags([]);
                  setFilters({ ...filters, travelStyle: '' });
                }}
                className={`px-6 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-2 ${
                  selectedTags.length === 0 && !filters.travelStyle
                    ? 'bg-gray-900 border-gray-900 text-white shadow-xl' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Trips
              </button>
              {tags.map(tag => (
                <button 
                  key={tag.name} 
                  onClick={() => {
                    if (selectedTags.includes(tag.name)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag.name));
                    } else {
                      setSelectedTags([...selectedTags, tag.name]);
                    }
                  }}
                  className={`px-6 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all border flex items-center gap-2 ${
                    selectedTags.includes(tag.name)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/30' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tag.icon}</span>
                  {tag.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full lg:w-48 appearance-none px-6 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10"
                >
                  <option value="trending">Trending</option>
                  <option value="budget_low">Budget: Low to High</option>
                  <option value="match">Match %</option>
                  <option value="recent">Recently Added</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center px-6 py-3 rounded-2xl font-black transition-all text-xs border ${
                  showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Advanced
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-8 p-10 bg-gray-50 rounded-[3rem] border border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Date Range</label>
                    <div className="grid grid-cols-2 gap-3">
                      <CustomDatePicker
                        selected={filters.startDate ? new Date(filters.startDate) : null}
                        onChange={(date) => setFilters({ ...filters, startDate: date ? date.toISOString() : '' })}
                        placeholder="Start"
                      />
                      <CustomDatePicker
                        selected={filters.endDate ? new Date(filters.endDate) : null}
                        onChange={(date) => setFilters({ ...filters, endDate: date ? date.toISOString() : '' })}
                        placeholder="End"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Max Budget</label>
                      <span className="text-xs font-black text-indigo-600">₹{filters.maxBudget.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="1000"
                      max="200000"
                      step="1000"
                      value={filters.maxBudget}
                      onChange={(e) => setFilters({ ...filters, maxBudget: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Max Group Size</label>
                      <span className="text-xs font-black text-indigo-600">{filters.maxGroupSize} People</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      step="1"
                      value={filters.maxGroupSize}
                      onChange={(e) => setFilters({ ...filters, maxGroupSize: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Travel Style</label>
                    <CustomSelect
                      value={filters.travelStyle}
                      onChange={(val) => setFilters({ ...filters, travelStyle: val })}
                      options={travelStyleOptions}
                      placeholder="All Styles"
                    />
                  </div>

                  <div className="md:col-span-3 lg:col-span-4 flex justify-end pt-4 border-t border-gray-200">
                    <button 
                      onClick={() => {
                        setFilters({ 
                          startDate: '', 
                          endDate: '', 
                          maxBudget: 100000, 
                          minGroupSize: 1, 
                          maxGroupSize: 20, 
                          travelStyle: '' 
                        });
                        setSelectedTags([]);
                        setSearchTerm('');
                      }}
                      className="text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                    >
                      Reset All Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-20">
        {/* Personalization Sections */}
        {user && !loading && filteredTrips.length > 0 && (
          <div className="space-y-32 mb-32">
            {recommendedTrips.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Recommended for You</h2>
                    <p className="text-gray-500 font-medium mt-2">Based on your vibe and travel interests</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-indigo-600 font-black text-sm bg-indigo-50 px-4 py-2 rounded-xl">
                    <Zap className="w-4 h-4 fill-indigo-600" /> 90%+ Match
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {recommendedTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

            {weekendGetaways.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">🔥 Weekend Getaways</h2>
                    <p className="text-gray-500 font-medium mt-2">Short escapes starting this Friday or Saturday</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {weekendGetaways.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

            {adventurePicks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">🏔 Adventure Picks</h2>
                    <p className="text-gray-500 font-medium mt-2">For those who seek the thrill of the wild</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {adventurePicks.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

            {budgetPicks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">💰 Budget Trips under ₹5000</h2>
                    <p className="text-gray-500 font-medium mt-2">Epic experiences that don't break the bank</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {budgetPicks.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}

            {nearbyTrips.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Trips Near You</h2>
                    <p className="text-gray-500 font-medium mt-2">Discover adventures starting in your region</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-emerald-600 font-black text-sm bg-emerald-50 px-4 py-2 rounded-xl">
                    <MapPin className="w-4 h-4" /> Under 500km
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {nearbyTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Main Feed */}
        <div className="mb-12">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">All Adventures</h2>
          <p className="text-gray-500 font-medium">Browse through all upcoming trips from our community</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm">
                <Skeleton className="h-64 w-full rounded-none" />
                <div className="p-10 space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-xl" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-12 w-32 rounded-2xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-32 bg-gray-50 rounded-[4rem] border border-gray-100">
            <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-red-500">
              <X className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Oops! Something went wrong</h3>
            <p className="text-gray-500 mb-10 max-w-md mx-auto font-medium">{error}</p>
            <button 
              onClick={() => fetchTrips()}
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
            >
              Try Again
            </button>
          </div>
        ) : filteredTrips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-gray-50 rounded-[4rem] border border-gray-100">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-gray-300 shadow-xl">
              <Compass className="w-12 h-12" />
            </div>
            <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">No trips found</h3>
            <p className="text-gray-500 mb-12 max-w-md mx-auto text-lg font-medium">We couldn't find any trips matching your current search or filters. Try broadening your criteria!</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedTags([]);
                  setFilters({ 
                    startDate: '', 
                    endDate: '', 
                    maxBudget: 100000, 
                    minGroupSize: 1, 
                    maxGroupSize: 20, 
                    travelStyle: '' 
                  });
                }}
                className="px-10 py-5 bg-white text-gray-900 border border-gray-200 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all shadow-sm"
              >
                Clear All Filters
              </button>
              <Link
                to="/trips/create"
                className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-500/40 flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" /> Create Your Own Trip
              </Link>
            </div>

            <div className="mt-20">
              <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-8">Popular Destinations</p>
              <div className="flex flex-wrap justify-center gap-4">
                {trendingDestinations.map(dest => (
                  <button 
                    key={dest}
                    onClick={() => handleSearchSubmit(dest)}
                    className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                  >
                    {dest}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button for Android */}
      {isAndroid && (
        <Link
          to="/trips/create"
          className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-95 transition-transform"
        >
          <Plane className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
};
