import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Send, User, Sparkles, Users, MessageSquare, Heart, Star, Info } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Link, useNavigate } from 'react-router-dom';
import { getAiBuddyRecommendations, BuddyMatch } from '../../services/geminiBuddyService';

interface BuddyPost {
  id: string;
  user_id: string;
  user_name: string;
  user_photo_url?: string | null;
  content: string;
  location?: string;
  dates?: string;
  created_at?: any;
}

export const BuddyFinder: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BuddyPost[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [aiMatches, setAiMatches] = useState<BuddyMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    location: '',
    dates: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
    if (!user || !newPost.content.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'buddy_posts'), {
        user_id: user.uid,
        user_name: profile?.name || user.displayName || 'Traveler',
        user_photo_url: profile?.photo_url || user.photoURL || null,
        content: newPost.content.trim(),
        location: newPost.location.trim(),
        dates: newPost.dates.trim(),
        created_at: serverTimestamp()
      });
      setNewPost({ content: '', location: '', dates: '' });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'buddy_posts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessage = async (targetUserId: string, targetName: string, context?: string) => {
    if (!user || user.uid === targetUserId) return;

    try {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-block p-3 bg-indigo-100 rounded-3xl mb-4">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Find Your Travel Buddy</h1>
          <p className="mt-2 text-lg text-gray-500">Post your plans and find someone to join your adventure!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Post Form */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100/50 border border-gray-100">
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Where do you want to go? What's the plan?"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[120px]"
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={newPost.location}
                      onChange={(e) => setNewPost({ ...newPost, location: e.target.value })}
                      placeholder="Location (optional)"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={newPost.dates}
                      onChange={(e) => setNewPost({ ...newPost, dates: e.target.value })}
                      placeholder="Dates (optional)"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPost.content.trim()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Post Buddy Request</span>
                    </>
                  )}
                </button>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold text-center border border-emerald-100"
                  >
                    Buddy request posted successfully!
                  </motion.div>
                )}
              </form>
            </div>

            {/* Feed */}
            <div className="space-y-6">
              <AnimatePresence>
                {posts.map((post) => {
                  const postProfile = userProfiles[post.user_id];
                  const photoUrl = postProfile?.photo_url || post.user_photo_url;
                  const userName = postProfile?.name || post.user_name;

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-8 rounded-[2.5rem] shadow-lg shadow-gray-200/50 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <Link to={`/profile/${post.user_id}`} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden">
                            {photoUrl ? (
                              <img src={photoUrl} alt={userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 leading-none">{userName}</h4>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {post.created_at?.toDate ? new Date(post.created_at.toDate()).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                        </Link>
                        {user && user.uid !== post.user_id && (
                          <button 
                            onClick={() => handleMessage(post.user_id, userName, post.content)}
                            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Message Buddy</span>
                          </button>
                        )}
                      </div>
                      
                      <p className="text-gray-700 leading-relaxed mb-6 font-medium">
                        {post.content}
                      </p>

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
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* AI Recommendations Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100/50 border border-gray-100 sticky top-24">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">AI Smart Matches</h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Based on your travel vibe and interests, Gemini suggests these travelers as perfect buddies.
              </p>

              <div className="space-y-6">
                {loadingMatches ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : aiMatches.length > 0 ? (
                  aiMatches.map((match) => (
                    <div key={match.uid} className="group">
                      <div className="flex items-start space-x-4 mb-3">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                          {match.photo_url ? (
                            <img src={match.photo_url} alt={match.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-6 h-6 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 truncate">{match.name}</h4>
                            <div className="flex items-center text-indigo-600 font-black text-xs">
                              <Heart className="w-3 h-3 mr-1 fill-indigo-600" />
                              {match.compatibilityScore}%
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {match.commonInterests.slice(0, 2).join(' • ')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-indigo-50/50 p-4 rounded-2xl mb-3">
                        <p className="text-xs text-indigo-900 leading-relaxed italic">
                          "{match.reasoning}"
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button 
                          onClick={() => navigate(`/profile/${match.uid}`)}
                          className="flex-1 py-2 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold hover:bg-indigo-50 transition-all"
                        >
                          View Profile
                        </button>
                        <button 
                          onClick={() => handleMessage(match.uid, match.name)}
                          className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Info className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-xs text-gray-400">No AI matches found yet. Try updating your profile interests!</p>
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
