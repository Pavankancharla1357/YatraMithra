import { db } from './src/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';

async function checkNotifications() {
  const q = query(collection(db, 'notifications'), limit(5));
  const snapshot = await getDocs(q);
  snapshot.docs.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

checkNotifications();
