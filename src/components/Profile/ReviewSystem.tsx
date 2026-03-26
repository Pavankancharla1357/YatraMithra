import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { createNotification } from '../../services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, User, Send } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Link } from 'react-router-dom';

interface ReviewSystemProps {
  targetUserId: string;
}

export const ReviewSystem: React.FC<ReviewSystemProps> = ({ targetUserId }) => {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('reviewee_id', '==', targetUserId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [targetUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReview.comment.trim()) return;

    setIsSubmitting(true);
    try {
      const reviewerName = profile?.name || 'Traveler';
      await addDoc(collection(db, 'reviews'), {
        reviewer_id: user.uid,
        reviewer_name: reviewerName,
        reviewee_id: targetUserId,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        created_at: serverTimestamp()
      });

      // Update target user's reputation score
      // We'll add the rating to their score (or we could do average, but simple increment/add is easier for now)
      // Let's just increment by the rating value
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, {
        reputation_score: increment(newReview.rating)
      });

      // Notify the target user
      await createNotification(
        targetUserId,
        'new_review',
        'New Review Received!',
        `${reviewerName} left you a ${newReview.rating}-star review.`,
        `/profile/${targetUserId}`
      );

      setSuccess('Review posted successfully!');
      setNewReview({ rating: 5, comment: '' });
      setTimeout(() => {
        setSuccess('');
        setShowForm(false);
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : 'New';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Traveler Reviews</h3>
          <div className="flex items-center mt-1">
            <div className="flex items-center text-amber-500 mr-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${reviews.length > 0 && i < Math.round(Number(averageRating)) ? 'fill-amber-500' : 'text-gray-200'}`} />
              ))}
            </div>
            <span className="text-sm font-bold text-gray-900">{averageRating}</span>
            {reviews.length > 0 && (
              <span className="text-sm text-gray-400 ml-1">({reviews.length} reviews)</span>
            )}
          </div>
        </div>
        {user?.uid !== targetUserId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Write a Review
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-bold text-center">
                  {success}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-widest">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className={`p-2 rounded-xl transition-all ${newReview.rating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                    >
                      <Star className={`w-8 h-8 ${newReview.rating >= star ? 'fill-amber-500' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-widest">Your Experience</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="How was your trip with this traveler?"
                  className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px] resize-none"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-gray-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Posting...' : 'Post Review'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No reviews yet.</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to share your experience!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-lg shadow-gray-100/50"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Link to={`/profile/${review.reviewer_id}`} className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center hover:opacity-80 transition-opacity">
                    <User className="w-5 h-5 text-indigo-600" />
                  </Link>
                  <div>
                    <Link to={`/profile/${review.reviewer_id}`} className="font-bold text-gray-900 leading-none hover:text-indigo-600 transition-colors">
                      {review.reviewer_name}
                    </Link>
                    <div className="mt-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {review.created_at?.toDate ? new Date(review.created_at.toDate()).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-amber-500">
                  <Star className="w-3 h-3 fill-amber-500 mr-1" />
                  <span className="text-sm font-bold">{review.rating}</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed italic">
                "{review.comment}"
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
