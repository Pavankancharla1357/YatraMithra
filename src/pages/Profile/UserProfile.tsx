import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { User, MapPin, Mail, Shield, Star, ChevronLeft, Plane, MessageSquare, Instagram, Linkedin, Twitter, Globe, Camera, Send, Users, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../components/Auth/AuthContext';
import { TripCard } from '../../components/Trips/TripCard';
import { ReviewSystem } from '../../components/Profile/ReviewSystem';
import { orderBy } from 'firebase/firestore';

export const UserProfile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [buddyPosts, setBuddyPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'trips' | 'reviews' | 'buddy'>('about');
  const [messaging, setMessaging] = useState(false);

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
          sender_name: 'TripTribe Bot',
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

    const fetchUserData = async () => {
      try {
        const [userDoc, tripsSnapshot, buddySnapshot] = await Promise.all([
          getDoc(doc(db, 'users', uid)),
          getDocs(query(collection(db, 'trips'), where('organizer_id', '==', uid))),
          getDocs(query(collection(db, 'buddy_posts'), where('user_id', '==', uid), orderBy('created_at', 'desc')))
        ]);

        if (userDoc.exists()) {
          setProfile(userDoc.data());
          setTrips(tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setBuddyPosts(buddySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] h-64 shadow-xl" />
            </div>
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] h-96 shadow-xl" />
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2 hover:bg-white rounded-full transition-colors flex items-center text-gray-600 font-bold text-sm"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8">
          <div className="h-48 bg-indigo-600 relative">
            {profile.cover_url ? (
              <img 
                src={profile.cover_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-violet-600" />
            )}
            <div className="absolute -bottom-16 left-12">
              <div className="w-32 h-32 bg-white rounded-[2rem] p-2 shadow-xl">
                <div className="w-full h-full bg-indigo-100 rounded-[1.5rem] flex items-center justify-center overflow-hidden">
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
            </div>
          </div>
          
          <div className="pt-20 pb-10 px-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{profile.name}</h1>
                <div className="flex items-center text-gray-500 mt-2">
                  <MapPin className="w-4 h-4 mr-1 text-indigo-600" />
                  <span>{profile.location_city}, {profile.location_country}</span>
                </div>
                {user && user.uid !== uid && (
                  <button
                    onClick={handleMessage}
                    disabled={messaging}
                    className="mt-4 flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{messaging ? 'Connecting...' : 'Message'}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-gray-900">{profile.reputation_score || 0}</p>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reputation</span>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-gray-900">{trips.length}</p>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trips</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Verification</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-3 text-indigo-600" />
                    <span>Email Verified</span>
                  </div>
                  {profile.is_email_verified ? <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" /> : <span className="text-[10px] font-bold text-gray-400 uppercase">No</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="w-4 h-4 mr-3 text-indigo-600" />
                    <span>Identity Verified</span>
                  </div>
                  {profile.is_id_verified ? <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" /> : <span className="text-[10px] font-bold text-gray-400 uppercase">No</span>}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests?.length > 0 ? profile.interests.map((interest: string) => (
                  <span key={interest} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    {interest}
                  </span>
                )) : <p className="text-xs text-gray-400 italic">No interests listed</p>}
              </div>
            </div>

            {/* Social Links Card */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Social Presence</h3>
              <div className="grid grid-cols-2 gap-4">
                <a 
                  href={formatSocialLink(profile.social_links?.instagram, 'instagram')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center p-4 rounded-xl transition-all group border border-transparent ${
                    profile.social_links?.instagram 
                      ? 'bg-gray-50 hover:bg-pink-50 hover:border-pink-100' 
                      : 'bg-gray-50/50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={(e) => !profile.social_links?.instagram && e.preventDefault()}
                >
                  <Instagram className={`w-5 h-5 mb-2 transition-colors ${
                    profile.social_links?.instagram ? 'text-gray-400 group-hover:text-pink-500' : 'text-gray-300'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    profile.social_links?.instagram ? 'text-gray-400 group-hover:text-pink-600' : 'text-gray-300'
                  }`}>Instagram</span>
                </a>
                <a 
                  href={formatSocialLink(profile.social_links?.linkedin, 'linkedin')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center p-4 rounded-xl transition-all group border border-transparent ${
                    profile.social_links?.linkedin 
                      ? 'bg-gray-50 hover:bg-blue-50 hover:border-blue-100' 
                      : 'bg-gray-50/50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={(e) => !profile.social_links?.linkedin && e.preventDefault()}
                >
                  <Linkedin className={`w-5 h-5 mb-2 transition-colors ${
                    profile.social_links?.linkedin ? 'text-gray-400 group-hover:text-blue-600' : 'text-gray-300'
                  }`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    profile.social_links?.linkedin ? 'text-gray-400 group-hover:text-blue-600' : 'text-gray-300'
                  }`}>LinkedIn</span>
                </a>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Tabs */}
            <div className="flex space-x-4 mb-8">
              <button
                onClick={() => setActiveTab('about')}
                className={`px-8 py-4 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl ${
                  activeTab === 'about' 
                    ? 'bg-indigo-600 text-white shadow-indigo-100' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 shadow-gray-200/50'
                }`}
              >
                <User className="w-5 h-5" />
                <span>About</span>
              </button>
              <button
                onClick={() => setActiveTab('trips')}
                className={`px-8 py-4 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl ${
                  activeTab === 'trips' 
                    ? 'bg-indigo-600 text-white shadow-indigo-100' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 shadow-gray-200/50'
                }`}
              >
                <Plane className="w-5 h-5" />
                <span>Trips</span>
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-8 py-4 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl ${
                  activeTab === 'reviews' 
                    ? 'bg-indigo-600 text-white shadow-indigo-100' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 shadow-gray-200/50'
                }`}
              >
                <Star className="w-5 h-5" />
                <span>Reviews</span>
              </button>
              <button
                onClick={() => setActiveTab('buddy')}
                className={`px-8 py-4 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl ${
                  activeTab === 'buddy' 
                    ? 'bg-indigo-600 text-white shadow-indigo-100' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 shadow-gray-200/50'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Buddy Posts</span>
              </button>
            </div>

            {activeTab === 'about' ? (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">About {profile.name.split(' ')[0]}</h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {profile.bio || "This user hasn't added a bio yet."}
                </p>
              </div>
            ) : activeTab === 'trips' ? (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 px-2">Organized Trips</h3>
                {trips.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {trips.map(trip => (
                      <TripCard key={trip.id} trip={trip} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                    <Plane className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                    <p className="text-sm text-gray-400">No trips organized yet.</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'buddy' ? (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 px-2">Buddy Requests</h3>
                {buddyPosts.length > 0 ? (
                  <div className="space-y-6">
                    {buddyPosts.map(post => (
                      <div key={post.id} className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/50 border border-gray-100">
                        <p className="text-gray-700 leading-relaxed mb-4 font-medium">{post.content}</p>
                        <div className="flex flex-wrap gap-4">
                          {post.location && (
                            <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                              <MapPin className="w-3 h-3 mr-1.5 text-indigo-500" />
                              {post.location}
                            </div>
                          )}
                          {post.dates && (
                            <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                              <Calendar className="w-3 h-3 mr-1.5 text-indigo-500" />
                              {post.dates}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                    <Users className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                    <p className="text-sm text-gray-400">No buddy requests yet.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                <ReviewSystem targetUserId={uid!} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
