import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type NotificationType = 'request_received' | 'request_accepted' | 'new_message' | 'trip_updated';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      user_id: userId,
      type,
      title,
      message,
      link,
      is_read: false,
      created_at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
