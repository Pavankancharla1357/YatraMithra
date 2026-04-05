import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { 
  collection, query, where, getDocs, orderBy, doc, updateDoc, 
  increment, getDoc, limit, onSnapshot 
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../components/Auth/AuthContext';
import { createNotification } from '../../services/notificationService';
import { TripCard } from '../../components/Trips/TripCard';
import { 
  LayoutDashboard, Plane, MessageSquare, Bell, ChevronRight, Star, Heart, Zap, Plus, 
  ShieldCheck, Calendar, Users, TrendingUp, CheckCircle2, Sparkles, ArrowRight,
  Filter, SortAsc, Clock, Activity, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import { subscribeToUserRating } from '../../services/reviewService';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [joinedTrips, setJoinedTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters & Sorting
  const [activeFilter, setActiveFilter] = useState<'my' | 'joined' | 'saved' | 'past'>('my');
  const [sortBy, setSortBy] = useState<'upcoming' | 'recent' | 'popular'>('upcoming');

  useEffect(() => {
    if (!user) return;

    const unsubscribeRating = subscribeToUserRating(user.uid, (newRating) => {
      setRating(newRating);
    });

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch My Trips (organized by user)
        console.log('Fetching my trips...');
        let tripsData: any[] = [];
        try {
          const tripsQ = query(collection(db, 'trips'), where('organizer_id', '==', user.uid));
          const tripsSnapshot = await getDocs(tripsQ);
          tripsData = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMyTrips(tripsData);
          console.log('My trips fetched successfully:', tripsData.length);
        } catch (err) {
          console.error('Error fetching my trips:', err);
        }

        // 2. Fetch Joined Trips
        console.log('Fetching joined trips...');
        try {
          const joinedQ = query(
            collection(db, 'trip_members'),
            where('user_id', '==', user.uid),
            where('status', '==', 'approved')
          );
          const joinedSnapshot = await getDocs(joinedQ);
          const joinedMemberData = joinedSnapshot.docs.map(doc => doc.data());
          console.log('Joined member data count:', joinedMemberData.length);
          
          if (joinedMemberData.length > 0) {
            const tripIds = joinedMemberData.map(m => m.trip_id);
            // Fetch trips individually to be resilient to permission errors on specific trips
            const joinedTripsResults = await Promise.all(
              tripIds.slice(0, 10).map(async (id) => {
                try {
                  const tripDoc = await getDoc(doc(db, 'trips', id));
                  return tripDoc.exists() ? { id: tripDoc.id, ...tripDoc.data() } : null;
                } catch (e) {
                  console.warn(`Permission denied or error fetching joined trip ${id}:`, e);
                  return null;
                }
              })
            );
            const validJoinedTrips = joinedTripsResults.filter(t => t !== null);
            setJoinedTrips(validJoinedTrips);
            console.log('Joined trips fetched successfully:', validJoinedTrips.length);
          }
        } catch (err) {
          console.error('Error fetching joined trips:', err);
        }

        // 3. Fetch Saved Trips
        console.log('Fetching saved trips...');
        if (profile?.saved_trips?.length > 0) {
          const savedTripsResults = await Promise.all(
            profile.saved_trips.slice(0, 10).map(async (id: string) => {
              try {
                const tripDoc = await getDoc(doc(db, 'trips', id));
                return tripDoc.exists() ? { id: tripDoc.id, ...tripDoc.data() } : null;
              } catch (e) {
                console.warn(`Permission denied or error fetching saved trip ${id}:`, e);
                return null;
              }
            })
          );
          const validSavedTrips = savedTripsResults.filter(t => t !== null);
          setSavedTrips(validSavedTrips);
          console.log('Saved trips fetched successfully:', validSavedTrips.length);
        }

        // 4. Fetch Pending Requests for user's trips
        console.log('Fetching pending requests...');
        try {
          if (tripsData.length > 0) {
            const tripIds = tripsData.map(t => t.id);
            const requestsQ = query(
              collection(db, 'trip_members'), 
              where('trip_id', 'in', tripIds.slice(0, 10)),
              where('status', '==', 'pending')
            );
            const requestsSnapshot = await getDocs(requestsQ);
            console.log('Pending requests snapshot count:', requestsSnapshot.docs.length);
            
            const requestsData = await Promise.all(
              requestsSnapshot.docs.map(async (docSnap) => {
                try {
                  const data = docSnap.data();
                  const userDoc = await getDoc(doc(db, 'users', data.user_id));
                  const userData = userDoc.exists() ? userDoc.data() : null;
                  return { 
                    id: docSnap.id, 
                    ...data,
                    user_name: userData?.name || data.user_name || 'Traveler',
                    user_photo: userData?.photo_url || null
                  };
                } catch (e) {
                  console.warn('Error fetching user data for request:', e);
                  return { id: docSnap.id, ...docSnap.data(), user_name: 'Traveler' };
                }
              })
            );
            setRequests(requestsData);
            console.log('Requests data processed successfully:', requestsData.length);
          }
        } catch (err) {
          console.error('Error fetching pending requests:', err);
        }

        // 5. Fetch Recent Activities (Now handled by real-time listener)
        // setActivities([]); 

      } catch (error: any) {
        console.error('CRITICAL: Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    return () => unsubscribeRating();
  }, [user, profile?.saved_trips]);

  // Real-time Activity Feed
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newActivities = snapshot.docs.map(doc => {
        const data = doc.data();
        const message = data.message || '';
        let userName = 'System';
        let action = message;

        // Try to extract name (assuming it's the first part of the message)
        const words = message.split(' ');
        if (words.length > 1 && data.type !== 'trip_updated') {
          userName = words[0];
          action = words.slice(1).join(' ');
        } else if (data.type === 'trip_updated') {
          userName = 'Trip Update';
          action = message;
        }

        return {
          id: doc.id,
          type: data.type,
          user: userName,
          action: action,
          time: data.created_at ? formatDistanceToNow(data.created_at.toDate(), { addSuffix: true }) : 'Just now'
        };
      });
      setActivities(newActivities);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredAndSortedTrips = useMemo(() => {
    let list = activeFilter === 'my' ? myTrips : 
               activeFilter === 'joined' ? joinedTrips : 
               activeFilter === 'saved' ? savedTrips : [];
    
    // Filter for past trips if selected
    if (activeFilter === 'past') {
      list = [...myTrips, ...joinedTrips].filter(t => new Date(t.start_date) < new Date());
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'upcoming') {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      }
      if (sortBy === 'recent') {
        return new Date(b.created_at?.seconds * 1000 || 0).getTime() - new Date(a.created_at?.seconds * 1000 || 0).getTime();
      }
      if (sortBy === 'popular') {
        return (b.current_members || 0) - (a.current_members || 0);
      }
      return 0;
    });
  }, [myTrips, joinedTrips, activeFilter, sortBy]);

  const profileStrength = useMemo(() => {
    if (!profile) return 0;
    let strength = 0;
    if (profile.name) strength += 20;
    if (profile.bio) strength += 20;
    if (profile.photo_url) strength += 20;
    if (profile.interests?.length > 0) strength += 20;
    if (profile.vibe_quiz_results) strength += 20;
    return strength;
  }, [profile]);

  const insights = useMemo(() => {
    const upcoming = [...myTrips, ...joinedTrips].filter(t => {
      const start = new Date(t.start_date);
      const now = new Date();
      const diff = start.getTime() - now.getTime();
      return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // within a week
    });

    return [
      { 
        id: 'trips', 
        label: upcoming.length > 0 ? `${upcoming.length} trips starting this week` : 'No trips this week',
        ctaLabel: upcoming.length > 0 ? 'View Trips' : 'Explore Trips',
        icon: <Plane className="w-5 h-5 text-indigo-600" />,
        color: 'bg-indigo-50',
        path: upcoming.length > 0 ? '#trips-section' : '/discover'
      },
      { 
        id: 'requests', 
        label: requests.length > 0 ? `${requests.length} new join requests` : 'No new requests',
        ctaLabel: requests.length > 0 ? 'Review Requests' : 'Check Requests',
        icon: <Users className="w-5 h-5 text-amber-600" />,
        color: 'bg-amber-50',
        path: '#requests-section'
      },
      { 
        id: 'profile', 
        label: profileStrength < 100 ? 'Complete your profile' : 'Profile looks great!',
        ctaLabel: profileStrength < 100 ? 'Complete Now' : 'View Profile',
        icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
        color: 'bg-emerald-50',
        path: profileStrength < 100 ? '/profile/setup' : '/profile'
      },
      { 
        id: 'matches', 
        label: '5 new match suggestions',
        ctaLabel: 'Find Buddies',
        icon: <Zap className="w-5 h-5 text-rose-600" />,
        color: 'bg-rose-50',
        path: '/buddy-finder'
      }
    ];
  }, [myTrips, joinedTrips, requests, profileStrength]);

  const handleInsightClick = (insight: any) => {
    if (insight.path.startsWith('#')) {
      const id = insight.path.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // If scrolling to trips, maybe adjust filter
        if (id === 'trips-section') {
          const upcoming = [...myTrips, ...joinedTrips].filter(t => {
            const start = new Date(t.start_date);
            const now = new Date();
            const diff = start.getTime() - now.getTime();
            return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
          });
          if (upcoming.length > 0) {
            // Check if upcoming trips are mine or joined
            const isMine = myTrips.some(mt => upcoming.some(ut => ut.id === mt.id));
            if (isMine) setActiveFilter('my');
            else setActiveFilter('joined');
            setSortBy('upcoming');
          }
        }
      }
    } else {
      navigate(insight.path);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected', tripId: string) => {
    try {
      const requestRef = doc(db, 'trip_members', requestId);
      const requestSnap = await getDoc(requestRef);
      const requestData = requestSnap.data();
      
      await updateDoc(requestRef, { status: action });
      
      if (action === 'approved') {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        const tripData = tripSnap.data();
        
        await updateDoc(tripRef, {
          current_members: increment(1)
        });

        if (requestData) {
          await createNotification(
            requestData.user_id,
            'request_accepted',
            'Request Approved!',
            `Your request to join the trip to ${tripData?.destination_city} has been approved.`,
            `/trips/${tripId}`
          );
        }
      } else if (action === 'rejected') {
        if (requestData) {
          const tripRef = doc(db, 'trips', tripId);
          const tripSnap = await getDoc(tripRef);
          const tripData = tripSnap.data();
          
          await createNotification(
            requestData.user_id,
            'trip_updated',
            'Request Update',
            `Your request to join the trip to ${tripData?.destination_city} was not accepted at this time.`,
            `/discover`
          );
        }
      }
      
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error(`Error ${action} request:`, error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded w-64" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </div>
            <div className="w-48 h-14 bg-gray-200 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] h-64 shadow-xl" />
              <div className="bg-white p-8 rounded-[2.5rem] h-96 shadow-xl" />
            </div>
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] h-80 shadow-xl" />
                <div className="bg-white p-8 rounded-[2.5rem] h-80 shadow-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-gray-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-red-500">
            <Bell className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Dashboard Error</h3>
          <p className="text-gray-500 mb-10 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isAndroid ? 'pb-32' : 'pb-20'}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isAndroid ? 'py-6 pt-safe' : 'py-12'}`}>
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
                {isAndroid ? 'Dashboard' : `Welcome back, ${profile?.name?.split(' ')[0]}`}
              </h1>
              <p className="text-sm sm:text-lg text-gray-500 mt-1 font-medium">
                {isAndroid ? `Hi ${profile?.name}, here's your travel summary.` : "Ready for your next adventure?"}
              </p>
            </div>
            
            {/* Quick Action Bar */}
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <Link
                to="/trips/create"
                className="flex-1 md:flex-none px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-95"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Trip
              </Link>
              <Link
                to="/buddy-finder"
                className="flex-1 md:flex-none px-6 py-3.5 bg-white text-gray-900 border border-gray-200 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center active:scale-95"
              >
                <Users className="w-4 h-4 mr-2 text-indigo-600" /> Find Buddy
              </Link>
              <Link
                to="/messages"
                className="px-4 py-3.5 bg-white text-gray-900 border border-gray-200 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center active:scale-95"
              >
                <MessageSquare className="w-4 h-4 text-indigo-600" />
              </Link>
            </div>
          </div>

          {/* Smart Insights Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.map((insight) => (
              <motion.div
                key={insight.id}
                whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleInsightClick(insight)}
                className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center space-x-4 cursor-pointer transition-all"
              >
                <div className={`w-12 h-12 ${insight.color} rounded-2xl flex items-center justify-center shrink-0`}>
                  {insight.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{insight.label}</p>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">
                    {insight.ctaLabel}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Actionable Widgets */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Strength Widget */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Profile Strength</h3>
                <span className="text-indigo-600 font-black text-sm">{profileStrength}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${profileStrength}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              </div>
              <p className="text-xs text-gray-500 mb-4 font-medium">
                {profileStrength < 100 
                  ? "Complete your profile to get 3x more match suggestions." 
                  : "Your profile is top-notch! You're ready for any adventure."}
              </p>
              {profileStrength < 100 && (
                <Link
                  to="/profile/setup"
                  className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center hover:bg-indigo-100 transition-all"
                >
                  Complete Profile
                </Link>
              )}
            </div>

            {/* Join Requests Widget */}
            <div id="requests-section" className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Join Requests</h3>
                {requests.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
                    {requests.length} New
                  </span>
                )}
              </div>
              
              {requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.slice(0, 3).map((req) => (
                    <div key={req.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-colors">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl overflow-hidden">
                          {req.user_photo ? (
                            <img src={req.user_photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-600 font-bold">
                              {req.user_name?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{req.user_name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">For: {req.trip_name || 'Your Trip'}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleRequestAction(req.id, 'approved', req.trip_id)}
                          className="flex-1 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all active:scale-95"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRequestAction(req.id, 'rejected', req.trip_id)}
                          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold rounded-lg hover:bg-gray-50 transition-all active:scale-95"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {requests.length > 3 && (
                    <button className="w-full py-2 text-indigo-600 text-[10px] font-bold uppercase tracking-widest hover:underline">
                      View All {requests.length} Requests
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400 font-medium mb-4">No pending requests yet.</p>
                  <Link to="/trips/create" className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">
                    Create a trip to get requests
                  </Link>
                </div>
              )}
            </div>

            {/* Smart Suggestions Widget */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-200/50 text-white relative overflow-hidden">
              <Sparkles className="absolute -top-2 -right-2 w-24 h-24 text-white/10 rotate-12" />
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <h3 className="text-lg font-bold">Smart Suggestions</h3>
                </div>
                <p className="text-xs text-indigo-100 mb-6 font-medium leading-relaxed">
                  {profile?.interests?.length > 0 
                    ? `Based on your interest in ${profile.interests[0]}, we found 3 groups heading to the mountains next month.`
                    : "Complete your interests to get personalized trip recommendations from our AI buddy."}
                </p>
                <Link
                  to={profile?.interests?.length > 0 ? "/discover" : "/profile/setup"}
                  className="w-full py-3 bg-white/20 backdrop-blur-md text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/30 transition-all border border-white/20"
                >
                  {profile?.interests?.length > 0 ? "Explore Matches" : "Add Interests"} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Activity Feed Widget */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-600" /> Recent Activity
              </h3>
              <div className="space-y-6">
                {activities.length > 0 ? (
                  activities.map((activity) => {
                    const config = (() => {
                      switch (activity.type) {
                        case 'request_received':
                        case 'request_accepted':
                          return { icon: <UserCheck className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600' };
                        case 'new_message':
                          return { icon: <MessageSquare className="w-4 h-4" />, color: 'bg-indigo-50 text-indigo-600' };
                        case 'trip_updated':
                          return { icon: <Zap className="w-4 h-4" />, color: 'bg-amber-50 text-amber-600' };
                        case 'new_review':
                          return { icon: <Star className="w-4 h-4 fill-current" />, color: 'bg-rose-50 text-rose-600' };
                        default:
                          return { icon: <Bell className="w-4 h-4" />, color: 'bg-gray-50 text-gray-600' };
                      }
                    })();

                    return (
                      <div key={activity.id} className="flex space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                          {config.icon}
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-600 leading-tight">
                            <span className="font-bold text-gray-900">{activity.user}</span> {activity.action}
                          </p>
                          <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 block">{activity.time}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-400 font-medium">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reduced Dominance Widgets */}
            <div className="grid grid-cols-2 gap-4">
              <Link to="/document-vault" className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all group">
                <ShieldCheck className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">Vault</p>
              </Link>
              <Link to="/travel-matcher" className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm hover:border-rose-200 transition-all group">
                <Heart className="w-6 h-6 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">Matcher</p>
              </Link>
            </div>
          </div>

          {/* Main Content - Trips Section */}
          <div id="trips-section" className="lg:col-span-2 space-y-6">
            {/* Filters & Sorting Bar */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex bg-gray-50 p-1 rounded-2xl w-full sm:w-auto">
                {(['my', 'joined', 'saved', 'past'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeFilter === filter 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {filter === 'my' ? 'My Trips' : filter === 'joined' ? 'Joined' : filter === 'saved' ? 'Saved' : 'Past'}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <div className="flex items-center text-gray-400">
                  <SortAsc className="w-4 h-4 mr-2" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-600 focus:outline-none cursor-pointer"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="recent">Recent</option>
                    <option value="popular">Popular</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Trips Grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter + sortBy}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {filteredAndSortedTrips.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAndSortedTrips.map(trip => (
                      <TripCard key={trip.id} trip={trip} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-200 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <Plane className="text-gray-300 w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {activeFilter === 'my' ? "You haven't created any trips yet" : 
                       activeFilter === 'joined' ? "You haven't joined any trips yet" :
                       activeFilter === 'saved' ? "No saved trips found" : "No past trips found"}
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto mb-8 font-medium">
                      {activeFilter === 'my' ? "Start your first adventure and find companions to join you." : 
                       "Explore the world and find amazing trips to join."}
                    </p>
                    <Link
                      to={activeFilter === 'my' ? "/trips/create" : "/discover"}
                      className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                    >
                      {activeFilter === 'my' ? "Create Your First Trip" : "Discover Trips"}
                    </Link>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
