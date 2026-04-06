import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User, MapPin, MessageSquare, ChevronLeft, Search, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../components/Auth/AuthContext';
import { toast } from 'sonner';

export const ConnectionsList: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const targetUid = uid || user?.uid;
  const isOwner = user?.uid === targetUid;

  useEffect(() => {
    if (!targetUid) return;

    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, 'users', targetUid));
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };

    fetchProfile();
    fetchConnections(1);
  }, [targetUid]);

  const fetchConnections = async (pageNum: number, append = false) => {
    if (!targetUid) return;
    
    if (append) setIsFetchingMore(true);
    else setLoading(true);

    try {
      // Fetch all accepted connections for the user from Firestore directly
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

      const [senderSnap, receiverSnap] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);

      const connectionUids = [
        ...senderSnap.docs.map(doc => doc.data().receiver_id),
        ...receiverSnap.docs.map(doc => doc.data().sender_id)
      ];

      if (connectionUids.length === 0) {
        setConnections([]);
        setTotal(0);
        setHasMore(false);
        return;
      }

      // Paginate the UIDs
      const limit = 20;
      const offset = (pageNum - 1) * limit;
      const paginatedUids = connectionUids.slice(offset, offset + limit);

      // Fetch user profiles for these UIDs
      const userProfilesPromises = paginatedUids.map(async (uid) => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          return {
            uid: userDoc.id,
            name: data?.name,
            username: data?.username,
            photo_url: data?.photo_url,
            location_city: data?.location_city,
            location_country: data?.location_country
          };
        }
        return null;
      });

      const newConnections = (await Promise.all(userProfilesPromises)).filter(p => p !== null);

      if (append) {
        setConnections(prev => [...prev, ...newConnections]);
      } else {
        setConnections(newConnections);
      }
      
      setTotal(connectionUids.length);
      setPage(pageNum);
      setHasMore(newConnections.length === limit && (pageNum * limit) < connectionUids.length);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetchingMore) {
      fetchConnections(page + 1, true);
    }
  };

  const filteredConnections = connections.filter(conn => 
    conn.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMessage = (targetId: string) => {
    // Navigate to profile and trigger message logic there
    navigate(`/profile/${targetId}`);
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-[800px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900">Connections</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {profile?.name || 'User'}'s Network • {total} Total
              </p>
            </div>
          </div>
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
          />
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredConnections.length > 0 ? (
            filteredConnections.map((conn) => (
              <motion.div
                key={conn.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div 
                    onClick={() => navigate(`/profile/${conn.uid}`)}
                    className="w-14 h-14 bg-indigo-50 rounded-2xl overflow-hidden cursor-pointer"
                  >
                    {conn.photo_url ? (
                      <img 
                        src={conn.photo_url} 
                        alt={conn.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-6 h-6 text-indigo-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 
                      onClick={() => navigate(`/profile/${conn.uid}`)}
                      className="font-black text-gray-900 hover:text-indigo-600 cursor-pointer transition-colors"
                    >
                      {conn.name}
                    </h3>
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                      {conn.username && <span className="text-indigo-500">@{conn.username}</span>}
                      {conn.location_city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{conn.location_city}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigate(`/profile/${conn.uid}`)}
                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    Profile
                  </button>
                  {isOwner && (
                    <button 
                      onClick={() => navigate(`/profile/${conn.uid}`)} // Navigate to profile to use existing message logic
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-1">No connections found</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                {searchTerm ? "Try searching for someone else." : "This user hasn't made any connections yet."}
              </p>
            </div>
          )}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isFetchingMore}
              className="w-full py-4 text-indigo-600 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {isFetchingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Load More Connections'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
