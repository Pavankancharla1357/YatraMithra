import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { User, MapPin, Shield, Star, Plane, MessageSquare, Instagram, Linkedin, Twitter, Globe, Camera, Users, Calendar, Edit2, Zap, Check, ChevronRight, Settings, LogOut, Award, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../components/Auth/AuthContext';
import { TripCard } from '../../components/Trips/TripCard';
import { ReviewSystem } from '../../components/Profile/ReviewSystem';
import { EditProfileModal } from '../../components/Profile/EditProfileModal';
import { TravelVibeQuiz } from '../../components/Profile/TravelVibeQuiz';
import { subscribeToUserRating } from '../../services/reviewService';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, logout } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [buddyPosts, setBuddyPosts] = useState<any[]>([]);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'trips' | 'reviews' | 'activity' | 'security'>('about');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const unsubscribeRating = subscribeToUserRating(user.uid, (newRating) => {
      setRating(newRating);
    });

    const fetchUserData = async () => {
      try {
        const [tripsSnapshot, buddySnapshot] = await Promise.all([
          getDocs(query(collection(db, 'trips'), where('organizer_id', '==', user.uid))),
          getDocs(query(collection(db, 'buddy_posts'), where('user_id', '==', user.uid), orderBy('created_at', 'desc')))
        ]);

        setTrips(tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setBuddyPosts(buddySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    fetchUserData();
    return () => {
      unsubscribeRating();
    };
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const formatSocialLink = (url: string, platform: 'instagram' | 'linkedin' | 'twitter') => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    
    const baseUrls = {
      instagram: 'https://instagram.com/',
      linkedin: 'https://linkedin.com/in/',
      twitter: 'https://twitter.com/'
    };
    
    return `${baseUrls[platform]}${url.replace('@', '')}`;
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 1. HEADER REFINEMENT (HIGH PRIORITY) */}
      <div className="relative h-[400px] sm:h-[450px] overflow-hidden group/cover">
        {/* Cover Image (z-0) */}
        {profile.cover_url ? (
          <img 
            src={profile.cover_url} 
            alt="Cover" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-105 z-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 z-0" />
        )}

        {/* Dark Overlay (z-10) - Strong gradient overlay (dark bottom fade) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />

        {/* Content Container (z-20) */}
        <div className="absolute inset-0 z-20 flex items-end">
          <div className="max-w-[1200px] mx-auto w-full px-6 py-10 sm:px-8">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
              
              {/* LEFT ZONE: Avatar, Name, Tagline, Meta */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                {/* Avatar - Large, clean shadow */}
                <div className="relative group/avatar">
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] bg-white rounded-[2.5rem] p-1.5 shadow-2xl relative z-10 transition-transform duration-500 group-hover/avatar:scale-[1.02]">
                    <div className="w-full h-full bg-indigo-50 rounded-[2rem] flex items-center justify-center overflow-hidden">
                      {profile.photo_url ? (
                        <img 
                          src={profile.photo_url} 
                          alt={profile.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-16 h-16 text-indigo-600" />
                      )}
                    </div>
                  </div>
                  <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
                </div>

                <div className="flex-1">
                  {/* Name - Bold, Large, High Contrast */}
                  <h1 className="text-[28px] sm:text-[36px] font-black text-white tracking-tight drop-shadow-lg mb-1">
                    {profile.name}
                  </h1>
                  
                  {/* Tagline - Muted */}
                  <p className="text-white/80 text-sm sm:text-base font-medium mb-3 drop-shadow-md italic max-w-md">
                    {profile.tagline || "Adventure seeker • Weekend traveler • Explorer"}
                  </p>

                  {/* Meta - Location, Status */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/70 text-xs font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{profile.location_city || 'Earth'}, {profile.location_country || 'Traveler'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span>Online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER ZONE: Badges in a single horizontal row */}
              <div className="flex items-center gap-3">
                {profile.is_id_verified && (
                  <div className="bg-blue-500/20 backdrop-blur-md p-2.5 rounded-2xl border border-blue-400/30 group/badge cursor-help relative">
                    <Shield className="w-5 h-5 text-blue-400 fill-blue-400/20" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Verified Identity
                    </div>
                  </div>
                )}
                <div className="bg-amber-500/20 backdrop-blur-md p-2.5 rounded-2xl border border-amber-400/30 group/badge cursor-help relative">
                  <Award className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Explorer Level 5
                  </div>
                </div>
                <div className="bg-indigo-500/20 backdrop-blur-md p-2.5 rounded-2xl border border-indigo-400/30 group/badge cursor-help relative">
                  <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Fast Responder
                  </div>
                </div>
              </div>

              {/* RIGHT ZONE: Edit Profile (primary), Settings/Logout (secondary) */}
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => navigate('/settings')}
                    className="flex-1 sm:flex-none p-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center active:scale-95"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex-1 sm:flex-none p-4 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all flex items-center justify-center active:scale-95"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FIX TAB NAVIGATION (IMPORTANT) */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100 flex flex-wrap gap-2">
          {[
            { id: 'about', label: 'About', icon: User },
            { id: 'trips', label: 'My Trips', icon: Plane },
            { id: 'reviews', label: 'Reviews', icon: Star },
            { id: 'activity', label: 'Activity', icon: Zap },
            { id: 'security', label: 'Security', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. IMPROVE LAYOUT STRUCTURE */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* 5. MAIN CONTENT AREA (70% -> lg:col-span-7) - Order 1 on mobile, 2 on desktop */}
          <div className="lg:col-span-7 space-y-8 order-1 lg:order-2">
            
            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'about' && (
                  <div className="space-y-6">
                    <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] -mr-8 -mt-8 opacity-50" />
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        About Me
                      </h3>
                      <div className="prose prose-indigo max-w-none">
                        <p className="text-gray-600 leading-relaxed text-base font-medium whitespace-pre-wrap">
                          {profile.bio || "Tell other travelers about yourself! Click 'Edit Profile' to add a bio."}
                        </p>
                      </div>
                      <div className="mt-8 flex flex-wrap gap-2.5">
                        {profile.interests?.map((interest: string) => (
                          <span key={interest} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:border-indigo-200 transition-colors cursor-default">
                            #{interest}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Verification Status */}
                    <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                        Verification Status
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-5 rounded-2xl border flex items-center justify-between ${profile.is_email_verified ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profile.is_email_verified ? 'bg-white text-emerald-600' : 'bg-white text-gray-400'}`}>
                              <Globe className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Email Verified</p>
                              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{profile.is_email_verified ? 'Completed' : 'Pending'}</p>
                            </div>
                          </div>
                          {profile.is_email_verified && <Check className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div className={`p-5 rounded-2xl border flex items-center justify-between ${profile.is_phone_verified ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profile.is_phone_verified ? 'bg-white text-emerald-600' : 'bg-white text-gray-400'}`}>
                              <Shield className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Phone Verified</p>
                              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{profile.is_phone_verified ? 'Completed' : 'Pending'}</p>
                            </div>
                          </div>
                          {profile.is_phone_verified && <Check className="w-5 h-5 text-emerald-600" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'trips' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                        My Organized Trips
                      </h3>
                      <button 
                        onClick={() => navigate('/trips/create')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        Create Trip
                      </button>
                    </div>

                    {trips.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {trips.map(trip => (
                          <motion.div
                            key={trip.id}
                            whileHover={{ y: -8 }}
                            className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
                          >
                            <div className="aspect-[16/10] overflow-hidden relative">
                              <img 
                                src={trip.cover_image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80'} 
                                alt={trip.destination_city}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute top-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-lg text-indigo-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                {trip.travel_style?.replace('_', ' ')}
                              </div>
                            </div>
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-lg font-black text-gray-900 line-clamp-1">{trip.destination_city}, {trip.destination_country}</h4>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</p>
                                  <p className="text-base font-black text-indigo-600">₹{trip.budget_max}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mb-5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{new Date(trip.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>{trip.current_members}/{trip.max_members}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => navigate(`/trips/${trip.id}`)}
                                className="w-full py-3 bg-gray-50 text-gray-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-gray-100"
                              >
                                View Details
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Plane className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No trips organized yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                      Traveler Reviews
                    </h3>
                    <ReviewSystem targetUserId={user!.uid} />
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-fuchsia-600 rounded-full" />
                      Recent Activity
                    </h3>
                    {buddyPosts.length > 0 ? (
                      <div className="space-y-4">
                        {buddyPosts.map(post => (
                          <div 
                            key={post.id} 
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
                          >
                            <p className="text-gray-700 leading-relaxed mb-4 text-sm font-medium">{post.content}</p>
                            <div className="flex flex-wrap gap-3">
                              {post.location && (
                                <div className="flex items-center text-[9px] font-black text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                  <MapPin className="w-3 h-3 mr-1.5" />
                                  {post.location}
                                </div>
                              )}
                              {post.dates && (
                                <div className="flex items-center text-[9px] font-black text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                  <Calendar className="w-3 h-3 mr-1.5" />
                                  {post.dates}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No recent activity</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                      Account Security
                    </h3>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Two-Factor Authentication</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Highly Recommended</p>
                          </div>
                        </div>
                        <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all">
                          Enable
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-6 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <Zap className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Active Sessions</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Manage your logged-in devices</p>
                          </div>
                        </div>
                        <button className="px-6 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 4. SIDEBAR OPTIMIZATION (30% -> lg:col-span-3) - Order 2 on mobile, 1 on desktop */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            
            {/* Quick Stats Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="text-center flex-1">
                <p className="text-xl font-black text-gray-900">{rating.averageRating || '5.0'}</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rating</span>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-center flex-1">
                <p className="text-xl font-black text-gray-900">{trips.length}</p>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block">Trips</span>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="text-center flex-1">
                <p className="text-xl font-black text-gray-900">{buddyPosts.length}</p>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block">Posts</span>
              </div>
            </div>

            {/* Profile Completion - Tighter grouping */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Profile Progress</h3>
                <Award className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xl font-black text-gray-900">85%</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Almost there!</span>
                </div>
                <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    className="h-full bg-gradient-to-r from-indigo-600 to-violet-600"
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">Complete your travel preferences for better matches.</p>
              </div>
            </div>

            {/* Travel Vibe - Reduced height */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Travel Vibe</h3>
                <button 
                  onClick={() => setShowQuiz(true)}
                  className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Adventure', value: profile.adventure_level || 80, icon: '🏔️', color: 'bg-orange-500' },
                  { label: 'Social', value: profile.social_style || 60, icon: '🤝', color: 'bg-blue-500' },
                  { label: 'Budget', value: profile.budget_style || 40, icon: '💎', color: 'bg-emerald-500' },
                  { label: 'Pace', value: profile.travel_pace || 70, icon: '⚡', color: 'bg-purple-500' }
                ].map((vibe) => (
                  <div key={vibe.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{vibe.icon}</span>
                        <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{vibe.label}</span>
                      </div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{vibe.value}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${vibe.value}%` }}
                        className={`h-full ${vibe.color}`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Presence - Clean up unused UI */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Social Presence</h3>
              <div className="space-y-3">
                {[
                  { id: 'instagram', icon: Instagram, color: 'text-pink-600 bg-pink-50', label: 'Instagram' },
                  { id: 'linkedin', icon: Linkedin, color: 'text-blue-600 bg-blue-50', label: 'LinkedIn' },
                  { id: 'twitter', icon: Twitter, color: 'text-sky-600 bg-sky-50', label: 'Twitter' },
                  { id: 'website', icon: Globe, color: 'text-gray-900 bg-gray-50', label: 'Website' }
                ].map((social) => {
                  const link = profile.social_links?.[social.id];
                  return link ? (
                    <a 
                      key={social.id}
                      href={formatSocialLink(link, social.id as any)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-50 hover:border-indigo-100 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${social.color}`}>
                          <social.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">{social.label}</span>
                      </div>
                      <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                    </a>
                  ) : (
                    <button 
                      key={social.id}
                      onClick={() => setShowEditModal(true)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-white">
                        <social.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">+ Add {social.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal 
            profile={{ ...profile, uid: user!.uid }} 
            onClose={() => setShowEditModal(false)} 
            onSuccess={async () => {
              setShowEditModal(false);
              await refreshProfile();
            }}
          />
        )}
        {showQuiz && (
          <TravelVibeQuiz 
            userId={user!.uid}
            onClose={() => setShowQuiz(false)} 
            onComplete={async () => {
              setShowQuiz(false);
              await refreshProfile();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
