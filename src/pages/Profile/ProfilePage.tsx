import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, getDoc, orderBy, addDoc, serverTimestamp, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User, MapPin, Shield, Star, Plane, MessageSquare, Instagram, Linkedin, Twitter, Globe, Camera, Users, Calendar, Edit2, Zap, Check, ChevronRight, Settings, LogOut, Award, Heart, Send, Plus, AlertCircle, UserPlus, UserMinus, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../components/Auth/AuthContext';
import { toast } from 'sonner';
import { TripCard } from '../../components/Trips/TripCard';
import { ReviewSystem } from '../../components/Profile/ReviewSystem';
import { EditProfileModal } from '../../components/Profile/EditProfileModal';
import { TravelVibeQuiz } from '../../components/Profile/TravelVibeQuiz';
import { InviteToTripModal } from '../../components/Profile/InviteToTripModal';
import { subscribeToUserRating } from '../../services/reviewService';
import { createNotification } from '../../services/notificationService';

export const ProfilePage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, refreshProfile, logout } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [trips, setTrips] = useState<any[]>([]);
  const [buddyPosts, setBuddyPosts] = useState<any[]>([]);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'trips' | 'reviews' | 'activity' | 'security'>('about');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const isOwner = !uid || user?.uid === uid;
  const targetUid = uid || user?.uid;

  useEffect(() => {
    if (!targetUid) {
      if (!loading) setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribeRating = subscribeToUserRating(targetUid, (newRating) => {
      setRating(newRating);
    });

    const unsubscribeProfile = onSnapshot(doc(db, 'users', targetUid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user profile:', error);
      setLoading(false);
    });

    const fetchUserData = async () => {
      try {
        // 1. Fetch organized trips
        const organizerQ = query(collection(db, 'trips'), where('organizer_id', '==', targetUid));
        
        // 2. Fetch joined trips (memberships)
        // Remove 'status' where clause to avoid composite index requirement
        const memberQ = query(
          collection(db, 'trip_members'),
          where('user_id', '==', targetUid)
        );

        const [organizerSnapshot, memberSnapshot, buddySnapshot] = await Promise.all([
          getDocs(organizerQ),
          getDocs(memberQ),
          getDocs(query(collection(db, 'buddy_posts'), where('user_id', '==', targetUid)))
        ]);

        const organizedTrips = organizerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isOrganizer: true }));
        
        // Filter approved memberships in memory
        const joinedTripIds = memberSnapshot.docs
          .filter(doc => doc.data().status === 'approved')
          .map(doc => doc.data().trip_id);
        
        const joinedTripsPromises = joinedTripIds
          .filter(id => !organizedTrips.some(t => t.id === id)) // Avoid duplicates
          .map(async (id) => {
            const tripSnap = await getDoc(doc(db, 'trips', id));
            if (tripSnap.exists()) {
              return { id: tripSnap.id, ...tripSnap.data(), isOrganizer: false };
            }
            return null;
          });
        
        const joinedTrips = (await Promise.all(joinedTripsPromises)).filter(t => t !== null);

        setTrips([...organizedTrips, ...joinedTrips].sort((a: any, b: any) => {
          const dateA = new Date(a.start_date || 0).getTime();
          const dateB = new Date(b.start_date || 0).getTime();
          return dateB - dateA; // Newest first
        }));
        
        // Sort buddy posts in memory
        const posts = buddySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedPosts = posts.sort((a: any, b: any) => {
          const timeA = a.created_at?.seconds || 0;
          const timeB = b.created_at?.seconds || 0;
          return timeB - timeA;
        });
        setBuddyPosts(sortedPosts);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const subscribeToConnection = () => {
      if (!user || !targetUid || isOwner) return () => {};
      const connId = [user.uid, targetUid].sort().join('_');
      return onSnapshot(doc(db, 'connections', connId), (docSnap) => {
        if (docSnap.exists()) {
          setConnection(docSnap.data());
        } else {
          setConnection(null);
        }
      }, (error) => {
        console.error('Error in connection snapshot:', error);
        setConnection(null);
      });
    };

    fetchUserData();
    const unsubscribeConn = subscribeToConnection();

    // Listen for accepted connections count
    let count1 = 0;
    let count2 = 0;
    const q1 = query(
      collection(db, 'connections'),
      where('sender_id', '==', targetUid),
      where('status', '==', 'accepted')
    );
    const q2 = query(
      collection(db, 'connections'),
      where('receiver_id', '==', targetUid),
      where('status', '==', 'accepted')
    );

    const unsubCount1 = onSnapshot(q1, (snap) => {
      count1 = snap.size;
      setConnectionsCount(count1 + count2);
    });

    const unsubCount2 = onSnapshot(q2, (snap) => {
      count2 = snap.size;
      setConnectionsCount(count1 + count2);
    });

    return () => {
      unsubscribeRating();
      unsubscribeProfile();
      unsubscribeConn();
      unsubCount1();
      unsubCount2();
    };
  }, [targetUid, user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleMessage = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/profile/${targetUid}` } });
      return;
    }
    if (!targetUid || isOwner) return;

    const toastId = toast.loading('Initiating chat...');
    setMessaging(true);
    try {
      console.log('--- handleMessage Start ---');
      console.log('Target UID:', targetUid);
      
      // Check if a direct channel already exists
      console.log('Querying existing channels...');
      const q = query(
        collection(db, 'channels'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', user.uid)
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
        console.log('Channels found:', snapshot.size);
      } catch (err: any) {
        console.error('Error querying channels:', err);
        throw new Error(`Permission denied reading channels: ${err.message}`);
      }

      let existingChannel = snapshot.docs.find(docSnap => 
        docSnap.data().participants.includes(targetUid)
      );

      if (existingChannel) {
        console.log('Existing channel found:', existingChannel.id);
        
        // Clear deleted flag if it exists
        await setDoc(doc(db, 'users', user.uid, 'chat_settings', existingChannel.id), { 
          deleted: false 
        }, { merge: true });

        // Update last message time to bring it to top
        await updateDoc(doc(db, 'channels', existingChannel.id), {
          last_message_time: serverTimestamp()
        });

        toast.dismiss(toastId);
        navigate(`/messages/${existingChannel.id}`);
      } else {
        console.log('Creating new channel...');
        // Create new channel
        let newChannelRef;
        try {
          newChannelRef = await addDoc(collection(db, 'channels'), {
            type: 'direct',
            participants: [user.uid, targetUid],
            last_message_time: serverTimestamp(),
            last_message: `Started a conversation with ${profile?.name || 'User'}`
          });
          console.log('New channel created:', newChannelRef.id);
        } catch (err: any) {
          console.error('Error creating channel:', err);
          throw new Error(`Permission denied creating channel: ${err.message}`);
        }
        
        // Send initial system message
        console.log('Sending initial system message...');
        try {
          await addDoc(collection(db, 'messages'), {
            channel_id: newChannelRef.id,
            sender_id: 'system',
            sender_name: 'YatraMitra Bot',
            content: `👋 Hi! ${profile?.name || 'Someone'} started a conversation with you.`,
            message_type: 'system',
            created_at: serverTimestamp()
          });
          console.log('System message sent');
        } catch (err: any) {
          console.error('Error sending system message:', err);
          // We don't throw here because the channel was already created
          toast.error('Channel created but failed to send initial message');
        }

        toast.success('Conversation started!');
        toast.dismiss(toastId);
        navigate(`/messages/${newChannelRef.id}`);
      }
      console.log('--- handleMessage End ---');
    } catch (error: any) {
      console.error('Error initiating chat:', error);
      toast.error('Failed to start chat: ' + (error.message || 'Unknown error'));
      toast.dismiss(toastId);
    } finally {
      setMessaging(false);
    }
  };

  useEffect(() => {
    console.log('Current connection state:', connection);
  }, [connection]);

  const handleConnect = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/profile/${targetUid}` } });
      return;
    }
    if (!targetUid || isOwner || isConnecting) return;

    // If already connected or pending request from us, show confirmation first
    const isPendingFromUs = connection?.status === 'pending' && connection.sender_id === user.uid;
    const isAccepted = connection?.status === 'accepted';

    if ((isAccepted || isPendingFromUs) && !showDisconnectConfirm) {
      setShowDisconnectConfirm(true);
      return;
    }

    setIsConnecting(true);
    setShowDisconnectConfirm(false);
    const connId = [user.uid, targetUid].sort().join('_');
    try {
      if (!connection) {
        // Optimistically set pending state
        const optimisticConnection = {
          sender_id: user.uid,
          receiver_id: targetUid,
          status: 'pending',
          created_at: new Date()
        };
        setConnection(optimisticConnection);

        // Send request
        await setDoc(doc(db, 'connections', connId), {
          sender_id: user.uid,
          receiver_id: targetUid,
          status: 'pending',
          created_at: serverTimestamp()
        });

        await createNotification(
          targetUid,
          'connection_request',
          'New Connection Request',
          `${currentUserProfile?.name || 'A traveler'} wants to connect with you.`,
          `/profile/${user.uid}`
        );
        toast.success('Connection request sent!');
      } else if (connection.status === 'pending' && connection.receiver_id === user.uid) {
        // Accept request
        const updatedConnection = { ...connection, status: 'accepted' };
        setConnection(updatedConnection); // Optimistic
        await updateDoc(doc(db, 'connections', connId), {
          status: 'accepted'
        });

        await createNotification(
          connection.sender_id,
          'connection_accepted',
          'Connection Accepted',
          `${currentUserProfile?.name || 'A traveler'} accepted your connection request!`,
          `/profile/${user.uid}`
        );
        toast.success('Connection accepted!');
      } else if (connection.status === 'accepted' || (connection.status === 'pending' && connection.sender_id === user.uid)) {
        // Disconnect or Cancel request
        setConnection(null); // Optimistic
        await deleteDoc(doc(db, 'connections', connId));
        const message = connection.status === 'accepted' ? 'Disconnected' : 'Request cancelled';
        toast.info(message);
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      toast.error('Failed to update connection. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReject = async () => {
    if (!user || !targetUid || !connection || isConnecting) return;
    setIsConnecting(true);
    const connId = [user.uid, targetUid].sort().join('_');
    try {
      // Send notification to the sender
      await createNotification(
        connection.sender_id,
        'connection_rejected',
        'Request Declined',
        `${currentUserProfile?.name || 'A traveler'} declined your connection request.`,
        `/profile/${user.uid}`
      );

      // Delete the connection document instead of setting to rejected
      await deleteDoc(doc(db, 'connections', connId));
      
      toast.info('Connection request rejected');
    } catch (error) {
      console.error('Error rejecting connection:', error);
      toast.error('Failed to reject request');
    } finally {
      setIsConnecting(false);
    }
  };

  const getDestinationImage = (city: any) => {
    if (typeof city !== 'string' || !city) return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';
    const cityLower = city.toLowerCase();
    const images: Record<string, string> = {
      'leh': 'https://images.unsplash.com/photo-1581791534721-e599df4417f7?auto=format&fit=crop&w=800&q=80',
      'ladakh': 'https://images.unsplash.com/photo-1581791534721-e599df4417f7?auto=format&fit=crop&w=800&q=80',
      'manali': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
      'nandi hills': 'https://images.unsplash.com/photo-1600100397608-f010f423b971?auto=format&fit=crop&w=800&q=80',
      'goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      'jaipur': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
      'udaipur': 'https://images.unsplash.com/photo-1585129819171-806f086600fd?auto=format&fit=crop&w=800&q=80',
      'mumbai': 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&w=800&q=80',
      'delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
      'bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
      'bengaluru': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
      'kerala': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
      'coorg': 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80',
      'kodagu': 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80',
      'ooty': 'https://images.unsplash.com/photo-1590534247854-e97d5e3fe367?auto=format&fit=crop&w=800&q=80',
      'munnar': 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80',
      'hampi': 'https://images.unsplash.com/photo-1581333100576-b73bbebd3c2e?auto=format&fit=crop&w=800&q=80',
      'pondicherry': 'https://images.unsplash.com/photo-1589793463357-5fb813435467?auto=format&fit=crop&w=800&q=80',
      'rishikesh': 'https://images.unsplash.com/photo-1598977123418-45454503889a?auto=format&fit=crop&w=800&q=80',
      'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
      'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
      'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
      'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80',
      'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
    };

    for (const [key, url] of Object.entries(images)) {
      if (cityLower.includes(key)) return url;
    }

    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
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
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 1. HEADER REFINEMENT */}
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
                    {profile.tagline || "Ready for the next adventure"}
                  </p>

                  {/* Meta - Location, Status */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/70 text-xs font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{profile.location_city || 'Earth'}, {profile.location_country || 'Traveler'}</span>
                    </div>
                    <button 
                      onClick={() => navigate(`/profile/${targetUid}/connections`)}
                      className="flex items-center gap-1.5 hover:text-white transition-colors group/conn"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400 group-hover/conn:scale-110 transition-transform" />
                      <span className="border-b border-transparent group-hover:border-white/50">{connectionsCount} Connections</span>
                    </button>
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
                {rating.totalReviews >= 5 && rating.averageRating >= 4.5 && (
                  <div className="bg-amber-500/20 backdrop-blur-md p-2.5 rounded-2xl border border-amber-400/30 group/badge cursor-help relative">
                    <Award className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Top Rated Host
                    </div>
                  </div>
                )}
                {trips.length >= 3 && (
                  <div className="bg-indigo-500/20 backdrop-blur-md p-2.5 rounded-2xl border border-indigo-400/30 group/badge cursor-help relative">
                    <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Frequent Traveler
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT ZONE: Actions */}
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                {isOwner ? (
                  <>
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
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex-1 sm:flex-none p-4 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 transition-all flex items-center justify-center active:scale-95"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      {connection?.status === 'pending' && connection.receiver_id === user.uid ? (
                        <>
                          <button 
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="flex-1 px-6 py-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            Accept Request
                          </button>
                          <button 
                            onClick={handleReject}
                            disabled={isConnecting}
                            className="flex-1 px-6 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={handleConnect}
                          disabled={isConnecting}
                          className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 ${
                            connection?.status === 'accepted'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : connection?.status === 'pending'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-white text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {connection?.status === 'accepted' ? (
                            <Check className="w-4 h-4" />
                          ) : connection?.status === 'pending' ? (
                            <Zap className="w-4 h-4" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                          {connection?.status === 'accepted' 
                            ? 'Disconnect' 
                            : connection?.status === 'pending'
                              ? 'Cancel Request'
                              : 'Connect'}
                        </button>
                      )}
                      
                      <button 
                        onClick={handleMessage}
                        disabled={messaging || connection?.status !== 'accepted'}
                        className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 ${
                          connection?.status === 'accepted'
                            ? 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {messaging ? '...' : 'Message'}
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        if (!user) {
                          navigate('/login', { state: { from: `/profile/${targetUid}` } });
                        } else {
                          setShowInviteModal(true);
                        }
                      }}
                      className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-2xl font-black text-xs hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 group relative overflow-hidden shadow-xl active:scale-95"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-20deg]" />
                      <Plane className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      Invite to Trip
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-gray-100 flex flex-wrap gap-2">
          {[
            { id: 'about', label: 'About', icon: User },
            { id: 'trips', label: isOwner ? 'My Trips' : 'Trips', icon: Plane },
            { id: 'reviews', label: 'Reviews', icon: Star },
            { id: 'activity', label: 'Activity', icon: Zap },
            ...(isOwner ? [{ id: 'security', label: 'Security', icon: Shield }] : [])
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

      {/* MAIN CONTENT */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          
          {/* MAIN CONTENT AREA */}
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
                        About {isOwner ? 'Me' : profile.name.split(' ')[0]}
                      </h3>
                      <div className="prose prose-indigo max-w-none">
                        <p className="text-gray-600 leading-relaxed text-base font-medium whitespace-pre-wrap">
                          {profile.bio || (isOwner ? "Tell other travelers about yourself! Click 'Edit Profile' to add a bio." : "This traveler hasn't added a bio yet.")}
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
                        {isOwner ? 'My Organized Trips' : `${profile.name.split(' ')[0]}'s Trips`}
                      </h3>
                      {isOwner && (
                        <button 
                          onClick={() => navigate('/trips/create')}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          Create Trip
                        </button>
                      )}
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
                                src={trip.cover_image || getDestinationImage(trip.destination_city)} 
                                alt={trip.destination_city}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80';
                                }}
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
                    <ReviewSystem targetUserId={targetUid!} />
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

                {activeTab === 'security' && isOwner && (
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

          {/* SIDEBAR */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            
            {/* Quick Stats Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="text-center flex-1">
                <p className="text-xl font-black text-gray-900">{rating.totalReviews > 0 ? rating.averageRating : 'New'}</p>
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

            {/* Profile Completion - Only for owner */}
            {isOwner && (() => {
              const fields = ['bio', 'photo_url', 'cover_url', 'location_city', 'tagline', 'interests', 'social_links'];
              const filledFields = fields.filter(f => {
                if (f === 'interests') return profile.interests?.length > 0;
                if (f === 'social_links') return Object.keys(profile.social_links || {}).length > 0;
                return !!profile[f];
              });
              const progress = Math.round((filledFields.length / fields.length) * 100);
              
              return (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Profile Progress</h3>
                    <Award className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-black text-gray-900">{progress}%</span>
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                        {progress === 100 ? 'Complete!' : 'Almost there!'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-600"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                      {progress === 100 ? 'Your profile is fully optimized!' : 'Complete your travel preferences for better matches.'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Travel Vibe */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Travel Vibe</h3>
                {isOwner && (
                  <button 
                    onClick={() => setShowQuiz(true)}
                    className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  </button>
                )}
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

            {/* Social Presence */}
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
                  ) : isOwner ? (
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
                  ) : null;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal 
            profile={{ ...profile, uid: targetUid! }} 
            onClose={() => setShowEditModal(false)} 
            onSuccess={async () => {
              setShowEditModal(false);
              if (isOwner) {
                await refreshProfile();
              }
            }}
          />
        )}

        {showInviteModal && (
          <InviteToTripModal 
            targetUser={{ ...profile, uid: targetUid! }} 
            onClose={() => setShowInviteModal(false)} 
          />
        )}
        {showQuiz && isOwner && (
          <TravelVibeQuiz 
            userId={targetUid!}
            onClose={() => setShowQuiz(false)} 
            onComplete={async () => {
              setShowQuiz(false);
              await refreshProfile();
            }}
          />
        )}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Are you sure?</h3>
              <p className="text-gray-600 mb-8">
                You're about to log out of your account. You'll need to sign in again to access your trips.
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  Yes, Log Out
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-3.5 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  No, Stay Logged In
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showDisconnectConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserMinus className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {connection?.status === 'accepted' ? 'Disconnect?' : 'Cancel Request?'}
              </h3>
              <p className="text-gray-600 mb-8">
                {connection?.status === 'accepted' 
                  ? `Are you sure you want to disconnect from ${profile.name}? You won't be able to message them directly until you reconnect.`
                  : `Are you sure you want to cancel your connection request to ${profile.name}?`
                }
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleConnect}
                  className="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
                >
                  {connection?.status === 'accepted' ? 'Yes, Disconnect' : 'Yes, Cancel Request'}
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="w-full py-3.5 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  No, Keep it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
