import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Generates a random 8-character alphanumeric invite code
 */
export const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Gets the full invite link for a trip
 */
export const getInviteLink = (tripId: string, inviteCode: string) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/join/${tripId}/${inviteCode}`;
};

/**
 * Validates an invite and joins the user to the trip
 */
export const joinTripViaInvite = async (
  tripId: string, 
  inviteCode: string, 
  userId: string, 
  userProfile: any
) => {
  try {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Trip not found');
    }

    const tripData = tripSnap.data();

    // Validate invite code
    if (tripData.invite_code !== inviteCode) {
      throw new Error('Invalid invite link');
    }

    // Check if trip is full
    if (tripData.current_members >= tripData.max_members) {
      throw new Error('This trip is already full');
    }

    // Check if user is already a member
    const membersQ = query(
      collection(db, 'trip_members'),
      where('trip_id', '==', tripId),
      where('user_id', '==', userId)
    );
    const membersSnap = await getDocs(membersQ);

    if (!membersSnap.empty) {
      const memberData = membersSnap.docs[0].data();
      if (memberData.status === 'approved') {
        return { status: 'already_member', tripId };
      }
      // If they were pending or rejected, we can "upgrade" them via invite
      const memberRef = doc(db, 'trip_members', membersSnap.docs[0].id);
      await updateDoc(memberRef, { 
        status: 'approved',
        joined_at: serverTimestamp(),
        joined_via: 'invite_link'
      });
    } else {
      // Create new member record
      await addDoc(collection(db, 'trip_members'), {
        trip_id: tripId,
        user_id: userId,
        user_name: userProfile?.name || 'Traveler',
        user_photo_url: userProfile?.photo_url || null,
        status: 'approved',
        joined_at: serverTimestamp(),
        joined_via: 'invite_link',
        request_message: 'Joined via invite link'
      });
    }

    // Update trip member count and invite count
    await updateDoc(tripRef, {
      current_members: increment(1),
      invite_count: increment(1)
    });

    return { status: 'success', tripId };
  } catch (error: any) {
    console.error('Error joining trip via invite:', error);
    throw error;
  }
};
