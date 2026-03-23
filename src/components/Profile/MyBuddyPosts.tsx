import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../Auth/AuthContext';
import { MapPin, Calendar, Trash2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const MyBuddyPosts: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'buddy_posts'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'buddy_posts', postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-400">Loading your posts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-black text-gray-900">My Buddy Requests</h3>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
          {posts.length} Posts
        </span>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 relative group"
              >
                <button
                  onClick={() => handleDelete(post.id)}
                  className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <p className="text-gray-700 leading-relaxed mb-6 font-medium pr-8">{post.content}</p>
                
                <div className="flex flex-wrap gap-3">
                  {post.location && (
                    <div className="flex items-center text-[10px] font-black text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                      <MapPin className="w-3 h-3 mr-2 text-indigo-500" />
                      {post.location.toUpperCase()}
                    </div>
                  )}
                  {post.dates && (
                    <div className="flex items-center text-[10px] font-black text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                      <Calendar className="w-3 h-3 mr-2 text-indigo-500" />
                      {post.dates.toUpperCase()}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-gray-200" />
          </div>
          <h4 className="text-lg font-black text-gray-900 mb-2">No Posts Yet</h4>
          <p className="text-gray-400 text-sm max-w-xs mx-auto font-medium">
            Your buddy requests will appear here once you create them in the Buddy Finder.
          </p>
        </div>
      )}
    </div>
  );
};
