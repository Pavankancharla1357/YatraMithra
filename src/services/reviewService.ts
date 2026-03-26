import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

export interface UserRating {
  averageRating: number;
  totalReviews: number;
}

export const getUserRating = async (userId: string): Promise<UserRating> => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('reviewee_id', '==', userId));
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const totalReviews = snapshot.size;
    const sumRatings = snapshot.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0);
    const averageRating = sumRatings / totalReviews;

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews
    };
  } catch (error) {
    console.error('Error fetching user rating:', error);
    return { averageRating: 0, totalReviews: 0 };
  }
};

export const subscribeToUserRating = (userId: string, callback: (rating: UserRating) => void) => {
  const reviewsRef = collection(db, 'reviews');
  const q = query(reviewsRef, where('reviewee_id', '==', userId));

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback({ averageRating: 0, totalReviews: 0 });
      return;
    }

    const totalReviews = snapshot.size;
    const sumRatings = snapshot.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0);
    const averageRating = sumRatings / totalReviews;

    callback({
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews
    });
  }, (error) => {
    console.error('Error subscribing to user rating:', error);
  });
};
