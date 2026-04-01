import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { User, MapPin, Mail, Shield, Star, ChevronLeft, Plane, MessageSquare, Instagram, Linkedin, Twitter, Globe, Camera, Send, Users, Calendar, Edit2, Zap, Plus, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../components/Auth/AuthContext';
import { TripCard } from '../../components/Trips/TripCard';
import { ReviewSystem } from '../../components/Profile/ReviewSystem';
import { EditProfileModal } from '../../components/Profile/EditProfileModal';

import { subscribeToUserRating } from '../../services/reviewService';

export const UserProfile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [buddyPosts, setBuddyPosts] = useState<any[]>([]);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'trips' | 'reviews' | 'buddy'>('about');
  const [messaging, setMessaging] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [showMatchBreakdown, setShowMatchBreakdown] = useState(false);

  const handleMessage = async () => {
    if (!user || !uid || user.uid === uid) return;

    setMessaging(true);
    try {
      // Check if a direct channel already exists
      const q = query(
        collection(db, 'channels'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingChannel = snapshot.docs.find(doc => 
        doc.data().participants.includes(uid)
      );

      if (existingChannel) {
        navigate(`/messages/${existingChannel.id}`);
      } else {
        // Create new channel
        const newChannelRef = await addDoc(collection(db, 'channels'), {
          type: 'direct',
          participants: [user.uid, uid],
          last_message_time: serverTimestamp(),
          last_message: `Started a conversation with ${profile.name}`
        });
        
        // Send initial system message
        await addDoc(collection(db, 'messages'), {
          channel_id: newChannelRef.id,
          sender_id: 'system',
          sender_name: 'YatraMitra Bot',
          content: `👋 Hi! ${currentUserProfile?.name || 'Someone'} started a conversation with you.`,
          message_type: 'system',
          created_at: serverTimestamp()
        });

        navigate(`/messages/${newChannelRef.id}`);
      }
    } catch (error) {
      console.error('Error initiating chat:', error);
    } finally {
      setMessaging(false);
    }
  };

  useEffect(() => {
    if (!uid) return;

    const unsubscribeRating = subscribeToUserRating(uid, (newRating) => {
      setRating(newRating);
    });

    const unsubscribeProfile = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user profile:', error);
      setLoading(false);
    });

    const fetchUserData = async () => {
      try {
        const [tripsSnapshot, buddySnapshot] = await Promise.all([
          getDocs(query(collection(db, 'trips'), where('organizer_id', '==', uid))),
          getDocs(query(collection(db, 'buddy_posts'), where('user_id', '==', uid), orderBy('created_at', 'desc')))
        ]);

        setTrips(tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setBuddyPosts(buddySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
    return () => {
      unsubscribeRating();
      unsubscribeProfile();
    };
  }, [uid]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 animate-pulse">
        <div className="h-64 bg-indigo-600" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-6 md:space-y-0 md:space-x-8">
              <div className="w-40 h-40 bg-gray-200 rounded-3xl" />
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <User className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto">The user profile you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/discover')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          Back to Discover
        </button>
      </div>
    </div>
  );

  const isOwner = user?.uid === uid;

  return (
    <div className="min-h-screen bg-gray-50 pb-32 sm:pb-20">
      {/* Refactored Header Section */}
      <div className="relative h-[45vh] min-h-[400px] overflow-hidden group/cover">
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

        {/* Dark Overlay (z-10) - Strict rgba(0,0,0,0.6) */}
        <div className="absolute inset-0 bg-black/60 z-10" />

        {/* Content Container (z-20) */}
        <div className="absolute inset-0 z-20 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 py-12 sm:px-8 sm:py-16">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 md:gap-12">
              
              {/* Left Side: Avatar & Info */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
                {/* Avatar - Fixed 120-140px */}
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
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-[28px] sm:text-[32px] font-black text-white tracking-tight drop-shadow-lg">
                      {profile.name}
                    </h1>
                    {profile.is_id_verified && (
                      <div className="bg-blue-500 p-1.5 rounded-full shadow-lg border border-blue-400/50 group/badge cursor-help relative">
                        <Shield className="w-4 h-4 text-white fill-white" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Verified Identity
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-white/90 text-base sm:text-lg font-medium mb-4 drop-shadow-md italic">
                    {profile.tagline || "Adventure seeker • Weekend traveler • Explorer"}
                  </p>

                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/80 text-sm font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-indigo-400" />
                      <span>{profile.location_city || 'Earth'}, {profile.location_country || 'Traveler'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span>Online</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                {!isOwner ? (
                  <>
                    <div className="flex gap-3">
                      <button className="flex-1 px-6 py-4 bg-white text-gray-900 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-xl">
                        <Users className="w-4 h-4" />
                        Connect
                      </button>
                      <button 
                        onClick={handleMessage}
                        disabled={messaging}
                        className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl font-black text-xs hover:bg-white/20 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {messaging ? '...' : 'Message'}
                      </button>
                    </div>
                    <button className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-2xl font-black text-xs hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 group relative overflow-hidden shadow-xl">
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
                      <Plane className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      Invite to Trip
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-black text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Stats Summary */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex justify-between items-center">
              <div className="text-center group cursor-pointer" onClick={() => setActiveTab('reviews')}>
                <p className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {rating.totalReviews > 0 ? rating.averageRating : 'New'}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rating</span>
                </div>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">{trips.length}</p>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 block">Trips</span>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">1.2k</p>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 block">Reach</span>
              </div>
            </div>

            {/* Verification & Badges */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Trust & Badges</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Shield className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">Verified Identity</span>
                  </div>
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {[
                    { label: 'Explorer', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                    { label: 'Top Traveler', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                    { label: 'Verified Host', color: 'bg-blue-50 text-blue-600 border-blue-100' }
                  ].map((badge) => (
                    <div key={badge.label} className={`px-4 py-2 rounded-xl border ${badge.color} text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                      {badge.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Travel Vibe Section */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Travel Vibe</h3>
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { label: 'Adventure', value: profile.adventure_level || 80, icon: '🏔️', color: 'bg-orange-500', text: 'Thrill Seeker' },
                  { label: 'Social', value: profile.social_style || 60, icon: '🤝', color: 'bg-blue-500', text: 'Social Butterfly' },
                  { label: 'Budget', value: profile.budget_style || 40, icon: '💎', color: 'bg-emerald-500', text: 'Luxury' },
                  { label: 'Pace', value: profile.travel_pace || 70, icon: '⚡', color: 'bg-purple-500', text: 'Fast Paced' }
                ].map((vibe) => (
                  <div key={vibe.label} className="group cursor-help relative">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{vibe.icon}</span>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{vibe.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{vibe.text}</span>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${vibe.value}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className={`h-full ${vibe.color} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Social Presence</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'instagram', icon: Instagram, color: 'hover:bg-pink-50 hover:text-pink-600 hover:border-pink-100', label: 'Instagram' },
                  { id: 'linkedin', icon: Linkedin, color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100', label: 'LinkedIn' },
                  { id: 'twitter', icon: Twitter, color: 'hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100', label: 'Twitter' },
                  { id: 'globe', icon: Globe, color: 'hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200', label: 'Website' }
                ].map((social) => {
                  const link = profile.social_links?.[social.id];
                  return (
                    <a 
                      key={social.id}
                      href={link ? formatSocialLink(link, social.id as any) : '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center p-4 rounded-2xl border border-gray-50 bg-gray-50/30 transition-all group ${link ? social.color : 'opacity-40 grayscale cursor-not-allowed'}`}
                      onClick={(e) => !link && e.preventDefault()}
                    >
                      <social.icon className="w-5 h-5 mb-2 text-gray-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-inherit">{social.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Reviews Preview Summary */}
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => setActiveTab('reviews')}
              className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="Reviewer" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-black text-gray-900">{rating.averageRating || '5.0'}</span>
                    <span className="text-xs font-bold text-gray-400">({rating.totalReviews} reviews)</span>
                  </div>
                  <p className="text-xs text-gray-500 italic font-medium">"Amazing travel buddy! Very organized and fun..."</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </motion.div>

            {/* Tabs Navigation */}
            <div className="bg-white/60 backdrop-blur-md p-2 rounded-3xl border border-white/50 shadow-xl shadow-gray-200/30 flex gap-2 sticky top-4 z-30">
              {[
                { id: 'about', label: 'About', icon: User },
                { id: 'trips', label: 'Trips', icon: Plane },
                { id: 'reviews', label: 'Reviews', icon: Star },
                { id: 'buddy', label: 'Buddy', icon: Users }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${
                    activeTab === tab.id 
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' 
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none"
                    />
                  )}
                </button>
              ))}
            </div>

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
                  <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] -mr-8 -mt-8 opacity-50" />
                      <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                        About {profile.name.split(' ')[0]}
                      </h3>
                      <div className="prose prose-indigo max-w-none">
                        <p className="text-gray-600 leading-[1.8] text-lg font-medium whitespace-pre-wrap">
                          {profile.bio || "This traveler is a bit mysterious! No bio added yet."}
                        </p>
                      </div>
                      <div className="mt-10 flex flex-wrap gap-3">
                        {profile.interests?.map((interest: string) => (
                          <span key={interest} className="px-5 py-2.5 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-gray-100 hover:border-indigo-200 transition-colors cursor-default">
                            #{interest}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Activity Feed / Timeline */}
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                      <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-fuchsia-600 rounded-full" />
                        Recent Activity
                      </h3>
                      <div className="space-y-8 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-50">
                        {[
                          { title: 'Joined Manali Trip', time: '2 days ago', icon: Plane, color: 'bg-indigo-500' },
                          { title: 'Posted a Buddy Request', time: '1 week ago', icon: Users, color: 'bg-fuchsia-500' },
                          { title: 'Verified Identity', time: '2 weeks ago', icon: Shield, color: 'bg-emerald-500' }
                        ].map((activity, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex gap-6 relative z-10"
                          >
                            <div className={`w-8 h-8 ${activity.color} rounded-xl flex items-center justify-center shadow-lg shadow-black/10`}>
                              <activity.icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-wide">{activity.title}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{activity.time}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'trips' && (
                  <div className="space-y-6">
                    {trips.length > 0 ? (
                      <div className="grid grid-cols-1 gap-6">
                        {trips.map(trip => (
                          <TripCard key={trip.id} trip={trip} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Plane className="w-10 h-10 text-gray-200" />
                        </div>
                        <p className="text-lg font-black text-gray-400 uppercase tracking-widest">No trips organized yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'buddy' && (
                  <div className="space-y-6">
                    {buddyPosts.length > 0 ? (
                      <div className="space-y-6">
                        {buddyPosts.map(post => (
                          <motion.div 
                            key={post.id} 
                            whileHover={{ y: -4 }}
                            className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-100 group"
                          >
                            <p className="text-gray-700 leading-relaxed mb-8 text-lg font-medium">{post.content}</p>
                            <div className="flex flex-wrap gap-4">
                              {post.location && (
                                <div className="flex items-center text-[10px] font-black text-gray-500 bg-gray-50 px-4 py-2 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                  <MapPin className="w-3.5 h-3.5 mr-2" />
                                  {post.location}
                                </div>
                              )}
                              {post.dates && (
                                <div className="flex items-center text-[10px] font-black text-gray-500 bg-gray-50 px-4 py-2 rounded-xl group-hover:bg-fuchsia-50 group-hover:text-fuchsia-600 transition-colors uppercase tracking-widest">
                                  <Calendar className="w-3.5 h-3.5 mr-2" />
                                  {post.dates}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Users className="w-10 h-10 text-gray-200" />
                        </div>
                        <p className="text-lg font-black text-gray-400 uppercase tracking-widest">No buddy requests yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                    <ReviewSystem targetUserId={uid!} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal 
            profile={{ ...profile, uid }} 
            onClose={() => setShowEditModal(false)} 
            onSuccess={async () => {
              setShowEditModal(false);
              const userDoc = await getDoc(doc(db, 'users', uid!));
              if (userDoc.exists()) {
                setProfile(userDoc.data());
              }
              if (user?.uid === uid) {
                refreshProfile();
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
