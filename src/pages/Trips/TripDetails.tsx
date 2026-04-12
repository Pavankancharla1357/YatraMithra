import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  deleteDoc,
  arrayUnion,
  onSnapshot
} from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { generateInviteCode } from '../../services/inviteService';
import { createNotification } from '../../services/notificationService';
import { JoinRequestModal } from '../../components/Trips/JoinRequestModal';
import { ShareModal } from '../../components/Trips/ShareModal';
import { EditTripModal } from '../../components/Trips/EditTripModal';
import { DeleteTripModal } from '../../components/Trips/DeleteTripModal';
import { ItineraryPlanner } from '../../components/Trips/ItineraryPlanner';
import { TripMap } from '../../components/Trips/TripMap';
import { 
  Calendar, 
  Users, 
  IndianRupee, 
  MapPin, 
  ChevronLeft, 
  Shield, 
  Star, 
  MessageSquare, 
  UserPlus, 
  Check, 
  Edit2, 
  Trash2, 
  User, 
  LayoutGrid, 
  Map as MapIcon, 
  Heart,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  Clock,
  Wallet,
  TrendingUp,
  Award,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { subscribeToUserRating } from '../../services/reviewService';

const Section = ({ 
  title, 
  icon: Icon, 
  children, 
  badge,
  className = ""
}: { 
  title: string; 
  icon?: any; 
  children: React.ReactNode; 
  badge?: string;
  className?: string;
}) => (
  <div className={`bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-gray-200/40 border border-gray-100/80 ${className}`}>
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-5">
        {Icon && (
          <div className="w-14 h-14 bg-indigo-50/50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <Icon className="w-7 h-7" />
          </div>
        )}
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight font-serif">{title}</h3>
          {badge && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 block">{badge}</span>}
        </div>
      </div>
    </div>
    <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed">
      {children}
    </div>
  </div>
);

export const CollapsibleCard = ({ 
  title, 
  icon: Icon, 
  isOpen, 
  onToggle, 
  children,
  badge
}: { 
  title: string; 
  icon: any; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
  badge?: string;
}) => (
  <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100/80 overflow-hidden transition-all duration-500">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-8 md:p-10 hover:bg-gray-50/50 transition-all group"
    >
      <div className="flex items-center space-x-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-indigo-50/50 text-indigo-600 shadow-inner'}`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="text-left">
          <h3 className="text-2xl font-black text-gray-900 tracking-tight font-serif">{title}</h3>
          {badge && <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 block">{badge}</span>}
        </div>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isOpen ? 'bg-gray-900 text-white rotate-180' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
        <ChevronDown className="w-6 h-6" />
      </div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
        >
          <div className="px-8 pb-10 md:px-10 md:pb-12 pt-0 border-t border-gray-50/50">
            <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [organizerRating, setOrganizerRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });
  const [members, setMembers] = useState<any[]>([]);
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary'>('overview');
  const [messaging, setMessaging] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    itinerary: true,
    includes: true,
    excludes: true,
    notes: true,
    whyJoin: true
  });
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const parseItinerary = (text: any) => {
    if (!text) return [];
    
    // If it's the full itinerary object (from FullItinerary interface)
    if (typeof text === 'object' && !Array.isArray(text) && text.days && Array.isArray(text.days)) {
      return text.days.map((dayObj: any, index: number) => ({
        day: dayObj.day || index + 1,
        marker: `Day ${dayObj.day || index + 1}`,
        title: dayObj.title || (dayObj.plan && Array.isArray(dayObj.plan) ? dayObj.plan[0]?.activity : 'Plan'),
        content: Array.isArray(dayObj.plan) 
          ? dayObj.plan.map((p: any) => `${p.time || ''} - ${p.activity || ''} (${p.location || ''})`).join('\n')
          : (typeof dayObj.plan === 'string' ? dayObj.plan : JSON.stringify(dayObj.plan))
      }));
    }

    // If it's already an array of objects (e.g. from structured AI output)
    if (Array.isArray(text)) {
      return text.map((item, index) => ({
        day: item.day || index + 1,
        marker: `Day ${item.day || index + 1}`,
        title: item.title || (item.activities && Array.isArray(item.activities) ? item.activities[0] : 'Activities'),
        content: Array.isArray(item.activities) ? item.activities.join('\n') : (typeof item.activities === 'string' ? item.activities : JSON.stringify(item.activities))
      }));
    }

    if (typeof text !== 'string' || !text.trim()) return [];
    // Split by "Day X" or "DayX" (case insensitive)
    const dayMarkers = text.match(/Day\s*\d+/gi);
    if (!dayMarkers) return [{ day: 1, title: 'Full Itinerary', content: text }];

    const days = text.split(/Day\s*\d+[:\-–]?/gi).filter(Boolean);
    return days.map((content, index) => {
      const marker = dayMarkers[index] || `Day ${index + 1}`;
      const firstLine = content.trim().split('\n')[0];
      const title = firstLine.length < 50 ? firstLine : 'Activities';
      const remainingContent = firstLine.length < 50 ? content.trim().split('\n').slice(1).join('\n') : content.trim();
      
      return {
        day: index + 1,
        marker,
        title,
        content: remainingContent
      };
    });
  };

  const getDestinationImage = (city: any) => {
    if (typeof city !== 'string' || !city) return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80';
    const cityLower = city.toLowerCase();
    const images: Record<string, string> = {
      'leh': 'https://images.unsplash.com/photo-1581791534721-e599df4417f7?auto=format&fit=crop&w=1920&q=80',
      'ladakh': 'https://images.unsplash.com/photo-1581791534721-e599df4417f7?auto=format&fit=crop&w=1920&q=80',
      'manali': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1920&q=80',
      'nandi hills': 'https://images.unsplash.com/photo-1600100397608-f010f423b971?auto=format&fit=crop&w=1920&q=80',
      'goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1920&q=80',
      'jaipur': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1920&q=80',
      'udaipur': 'https://images.unsplash.com/photo-1585129819171-806f086600fd?auto=format&fit=crop&w=1920&q=80',
      'mumbai': 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&w=1920&q=80',
      'delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1920&q=80',
      'bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1920&q=80',
      'bengaluru': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1920&q=80',
      'kerala': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1920&q=80',
      'coorg': 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=1920&q=80',
      'kodagu': 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=1920&q=80',
      'ooty': 'https://images.unsplash.com/photo-1590534247854-e97d5e3fe367?auto=format&fit=crop&w=1920&q=80',
      'munnar': 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1920&q=80',
      'hampi': 'https://images.unsplash.com/photo-1581333100576-b73bbebd3c2e?auto=format&fit=crop&w=1920&q=80',
      'pondicherry': 'https://images.unsplash.com/photo-1589793463357-5fb813435467?auto=format&fit=crop&w=1920&q=80',
      'rishikesh': 'https://images.unsplash.com/photo-1598977123418-45454503889a?auto=format&fit=crop&w=1920&q=80',
      'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1920&q=80',
      'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1920&q=80',
      'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1920&q=80',
      'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1920&q=80',
      'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1920&q=80',
    };

    for (const [key, url] of Object.entries(images)) {
      if (cityLower.includes(key)) return url;
    }

    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80';
  };

  const isOrganizer = user?.uid && trip?.organizer_id && user.uid === trip.organizer_id;
  const isAdminUser = currentUserProfile?.role === 'admin' || user?.email === 'pavankancharla1357@gmail.com';
  const canManageTrip = isOrganizer || isAdminUser;

  const handleMessageOrganizer = async () => {
    if (!user || !trip?.organizer_id || user.uid === trip.organizer_id) return;

    if (connectionStatus !== 'accepted') {
      toast.error('You must be connected with the organizer to message them.', {
        action: {
          label: 'View Profile',
          onClick: () => navigate(`/profile/${trip.organizer_id}`)
        }
      });
      return;
    }

    setMessaging(true);
    try {
      const q = query(
        collection(db, 'channels'),
        where('type', '==', 'direct'),
        where('participants', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingChannel = snapshot.docs.find(doc => 
        doc.data().participants.includes(trip.organizer_id)
      );

      if (existingChannel) {
        navigate(`/messages/${existingChannel.id}`);
      } else {
        const newChannelRef = await addDoc(collection(db, 'channels'), {
          type: 'direct',
          participants: [user.uid, trip.organizer_id],
          last_message_time: serverTimestamp(),
          last_message: `Started a conversation about trip: ${trip.destination_city}`
        });
        
        await addDoc(collection(db, 'messages'), {
          channel_id: newChannelRef.id,
          sender_id: 'system',
          sender_name: 'YatraMitra Bot',
          content: `👋 Hi! ${currentUserProfile?.name || 'Someone'} is interested in your trip to ${trip.destination_city} and started a conversation.`,
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

  const handleApproveMember = async (memberUid: string) => {
    if (!id || !isOrganizer) return;
    try {
      const q = query(
        collection(db, 'trip_members'),
        where('trip_id', '==', id),
        where('user_id', '==', memberUid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { status: 'approved' });
        await updateDoc(doc(db, 'trips', id), {
          current_members: increment(1)
        });
        
        // Add to group chat channel if it exists
        const channelRef = doc(db, 'channels', id);
        const channelSnap = await getDoc(channelRef);
        if (channelSnap.exists()) {
          await updateDoc(channelRef, {
            participants: arrayUnion(memberUid)
          });
        }

        // Notify the user
        await createNotification(
          memberUid,
          'request_accepted',
          'Trip Request Approved!',
          `Your request to join the trip to ${trip.destination_city} has been approved!`,
          `/trips/${id}`
        );

        // Update local state
        setMembers(prev => prev.map(m => m.uid === memberUid ? { ...m, status: 'approved' } : m));
      }
    } catch (error) {
      console.error('Error approving member:', error);
    }
  };

  const handleRejectMember = async (memberUid: string) => {
    if (!id || !isOrganizer) return;
    try {
      const q = query(
        collection(db, 'trip_members'),
        where('trip_id', '==', id),
        where('user_id', '==', memberUid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
        
        // Notify the user
        await createNotification(
          memberUid,
          'trip_updated',
          'Trip Request Update',
          `Your request to join the trip to ${trip.destination_city} was not accepted at this time.`,
          `/discover`
        );

        // Update local state
        setMembers(prev => prev.filter(m => m.uid !== memberUid));
      }
    } catch (error) {
      console.error('Error rejecting member:', error);
    }
  };

  const handleDeleteTrip = async () => {
    if (!id || !canManageTrip) {
      console.warn('Delete trip aborted: missing id or no permission', { id, canManageTrip });
      return;
    }
    
    console.log('handleDeleteTrip started for trip:', id, 'by user:', user?.uid);
    
    try {
      // 1. Delete all trip members
      console.log('Step 1: Deleting trip members...');
      const membersQ = query(collection(db, 'trip_members'), where('trip_id', '==', id));
      let membersSnapshot;
      try {
        membersSnapshot = await getDocs(membersQ);
        console.log(`Found ${membersSnapshot.size} members to delete`);
      } catch (e) {
        console.error('Error fetching trip members:', e);
        handleFirestoreError(e, OperationType.GET, 'trip_members');
        return;
      }
      
      const memberDeletions = membersSnapshot.docs.map(d => 
        deleteDoc(d.ref).catch(e => {
          console.error(`Failed to delete member ${d.id}:`, e);
          handleFirestoreError(e, OperationType.DELETE, `trip_members/${d.id}`);
        })
      );
      
      // 2. Delete all messages for this trip (group chat)
      console.log('Step 2: Deleting messages...');
      const messagesQ = query(collection(db, 'messages'), where('channel_id', '==', id));
      let messagesSnapshot;
      try {
        messagesSnapshot = await getDocs(messagesQ);
        console.log(`Found ${messagesSnapshot.size} messages to delete`);
      } catch (e) {
        console.error('Error fetching messages:', e);
        handleFirestoreError(e, OperationType.GET, 'messages');
        return;
      }
      
      const messageDeletions = messagesSnapshot.docs.map(d => 
        deleteDoc(d.ref).catch(e => {
          console.error(`Failed to delete message ${d.id}:`, e);
          handleFirestoreError(e, OperationType.DELETE, `messages/${d.id}`);
        })
      );

      // 3. Delete itinerary items (subcollection)
      console.log('Step 3: Deleting itinerary items...');
      const itineraryQ = collection(db, 'trips', id, 'itinerary');
      let itinerarySnapshot;
      try {
        itinerarySnapshot = await getDocs(itineraryQ);
        console.log(`Found ${itinerarySnapshot.size} itinerary items to delete`);
      } catch (e) {
        console.error('Error fetching itinerary:', e);
        handleFirestoreError(e, OperationType.GET, `trips/${id}/itinerary`);
        return;
      }
      
      const itineraryDeletions = itinerarySnapshot.docs.map(d => 
        deleteDoc(d.ref).catch(e => {
          console.error(`Failed to delete itinerary item ${d.id}:`, e);
          handleFirestoreError(e, OperationType.DELETE, `trips/${id}/itinerary/${d.id}`);
        })
      );

      // 4. Delete expenses (subcollection)
      console.log('Step 4: Deleting expenses...');
      const expensesQ = collection(db, 'trips', id, 'expenses');
      let expensesSnapshot;
      try {
        expensesSnapshot = await getDocs(expensesQ);
        console.log(`Found ${expensesSnapshot.size} expenses to delete`);
      } catch (e) {
        console.error('Error fetching expenses:', e);
        handleFirestoreError(e, OperationType.GET, `trips/${id}/expenses`);
        return;
      }
      
      const expenseDeletions = expensesSnapshot.docs.map(d => 
        deleteDoc(d.ref).catch(e => {
          console.error(`Failed to delete expense ${d.id}:`, e);
          handleFirestoreError(e, OperationType.DELETE, `trips/${id}/expenses/${d.id}`);
        })
      );

      // 5. Delete polls (related to the trip channel)
      console.log('Step 5: Deleting polls...');
      const pollsQ = query(collection(db, 'polls'), where('channel_id', '==', id));
      let pollsSnapshot;
      try {
        pollsSnapshot = await getDocs(pollsQ);
        console.log(`Found ${pollsSnapshot.size} polls to delete`);
      } catch (e) {
        console.error('Error fetching polls:', e);
        handleFirestoreError(e, OperationType.GET, 'polls');
        return;
      }
      
      const pollDeletions = pollsSnapshot.docs.map(d => 
        deleteDoc(d.ref).catch(e => {
          console.error(`Failed to delete poll ${d.id}:`, e);
          handleFirestoreError(e, OperationType.DELETE, `polls/${d.id}`);
        })
      );

      // 6. Delete the channel document
      console.log('Step 6: Checking for channel document...');
      const channelRef = doc(db, 'channels', id);
      let channelDoc;
      try {
        channelDoc = await getDoc(channelRef);
      } catch (e) {
        // If we can't even read the channel, it might be because it doesn't exist 
        // or we don't have permission. We'll log it but try to proceed if it's just a "not found"
        console.warn('Could not read channel document, it might not exist or permission denied:', e);
      }
      
      let channelDeletion = null;
      if (channelDoc?.exists()) {
        console.log('Channel document found, adding to deletion list');
        channelDeletion = deleteDoc(channelRef).catch(e => {
          console.error(`Failed to delete channel ${id}:`, e);
          handleFirestoreError(e, OperationType.DELETE, `channels/${id}`);
        });
      } else {
        console.log('No channel document found for this trip ID');
      }

      // Execute all deletions
      console.log('Step 7: Executing all deletions in parallel...');
      await Promise.all([
        ...memberDeletions,
        ...messageDeletions,
        ...itineraryDeletions,
        ...expenseDeletions,
        ...pollDeletions,
        ...(channelDeletion ? [channelDeletion] : [])
      ]);

      // 7. Finally delete the trip document itself
      console.log('Step 8: Deleting trip document...');
      try {
        await deleteDoc(doc(db, 'trips', id));
      } catch (e) {
        console.error('Error deleting trip document:', e);
        handleFirestoreError(e, OperationType.DELETE, `trips/${id}`);
      }
      
      console.log('Trip deletion successful, navigating to dashboard');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error in handleDeleteTrip:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!trip?.organizer_id) return;
    const unsubscribe = subscribeToUserRating(trip.organizer_id, (rating) => {
      setOrganizerRating(rating);
    });
    return () => unsubscribe();
  }, [trip?.organizer_id]);

  useEffect(() => {
    if (!user || !trip?.organizer_id || user.uid === trip.organizer_id) {
      setConnectionStatus(null);
      return;
    }

    const connId = [user.uid, trip.organizer_id].sort().join('_');
    const unsubscribe = onSnapshot(doc(db, 'connections', connId), (docSnap) => {
      if (docSnap.exists()) {
        setConnectionStatus(docSnap.data().status);
      } else {
        setConnectionStatus(null);
      }
    });

    return () => unsubscribe();
  }, [user, trip?.organizer_id]);

  // Ensure trip has an invite_code (for legacy trips)
  useEffect(() => {
    if (!trip || !id || !user || trip.organizer_id !== user.uid) return;
    
    if (!trip.invite_code) {
      console.log('Generating missing invite code for trip:', id);
      updateDoc(doc(db, 'trips', id), { 
        invite_code: generateInviteCode() 
      }).catch(err => console.error('Error generating invite code:', err));
    }
  }, [trip, id, user]);

  useEffect(() => {
    if (!id) return;

    const fetchTripData = async () => {
      setLoading(true);
      try {
        const tripRef = doc(db, 'trips', id);
        const tripSnap = await getDoc(tripRef);

        if (!tripSnap.exists()) {
          setTrip(null);
          setLoading(false);
          return;
        }

        const tripData = { id: tripSnap.id, ...tripSnap.data() } as any;
        setTrip(tripData);

        // Only fetch members and other data if user is logged in
        if (user) {
          // Lazy backfill invite code if missing
          const userIsOrganizer = user?.uid === tripData.organizer_id;
          if (!tripData.invite_code && userIsOrganizer) {
            const newCode = generateInviteCode();
            await updateDoc(tripRef, { 
              invite_code: newCode,
              invite_count: tripData.invite_count || 0 
            });
            tripData.invite_code = newCode;
            if (!tripData.invite_count) tripData.invite_count = 0;
          }

          // Fetch all members for this trip
          const membersQuery = query(collection(db, 'trip_members'), where('trip_id', '==', id));
          const membersSnap = await getDocs(membersQuery);
          
          // Set current user's membership status
          const myMemberDoc = membersSnap.docs.find(d => d.data().user_id === user.uid);
          if (myMemberDoc) {
            setMemberStatus(myMemberDoc.data().status);
          }

          // Identify members to fetch profiles for
          const memberDocs = membersSnap.docs.filter(d => d.data().user_id !== tripData.organizer_id);
          const memberIdsToFetch = memberDocs
            .filter(d => d.data().status === 'approved' || (userIsOrganizer && d.data().status === 'pending'))
            .map(d => d.data().user_id);

          // Fetch profiles in parallel
          const profilePromises = [
            getDoc(doc(db, 'users', tripData.organizer_id)),
            ...memberIdsToFetch.map(uid => getDoc(doc(db, 'users', uid)))
          ];

          const profileSnaps = await Promise.all(profilePromises);
          
          const allMembers: any[] = [];
          
          // Handle Organizer (first in profileSnaps)
          const orgSnap = profileSnaps[0];
          let organizerData: any;
          if (orgSnap.exists()) {
            organizerData = { uid: orgSnap.id, ...orgSnap.data(), isOrganizer: true };
          } else {
            // Fallback to trip data if user profile is missing
            organizerData = {
              uid: tripData.organizer_id,
              name: tripData.organizer_name || 'Organizer',
              photo_url: tripData.organizer_photo_url,
              is_verified: tripData.organizer_verified || false,
              isOrganizer: true
            };
          }
          setOrganizer(organizerData);
          allMembers.push(organizerData);

          // Handle other members
          for (let i = 1; i < profileSnaps.length; i++) {
            const pSnap = profileSnaps[i];
            const uid = memberIdsToFetch[i-1];
            const mDoc = memberDocs.find(d => d.data().user_id === uid);
            const status = mDoc?.data().status;

            if (pSnap.exists()) {
              allMembers.push({ uid: pSnap.id, ...pSnap.data(), status });
            } else {
              allMembers.push({
                uid,
                name: 'Traveler',
                photo_url: null,
                is_verified: false,
                status
              });
            }
          }

          setMembers(allMembers);
        }

      } catch (error: any) {
        console.error('Error fetching trip details:', error);
        if (error.message?.includes('insufficient permissions')) {
          setTrip({ error: 'private' });
        } else {
          setTrip(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-24 animate-pulse">
        <div className="h-96 bg-gray-200" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
          <div className="flex space-x-4 mb-8">
            <div className="w-32 h-12 bg-gray-200 rounded-2xl" />
            <div className="w-32 h-12 bg-gray-200 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 h-64" />
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 h-64" />
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 h-48" />
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!trip) return <div className="min-h-screen flex items-center justify-center">Trip not found</div>;
  
  if (!user) {
    return (
      <div className="min-h-screen bg-white pb-24">
        {/* Hero Image - Still show this for visual appeal */}
        <div className="relative h-96 bg-gray-200">
          <img
            src={trip.cover_image || getDestinationImage(trip.destination_city)}
            alt={trip.destination_city}
            className="w-full h-full object-cover blur-sm"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <button
            onClick={() => navigate('/discover')}
            className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <div className="max-w-md mx-auto px-4 -mt-32 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 text-center"
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Login Required</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Join our community to view full trip details, see who's going, and connect with fellow travelers.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/login', { state: { from: `/trips/${id}` } })}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-4 bg-white text-indigo-600 border-2 border-indigo-50 rounded-2xl font-bold hover:bg-gray-50 transition-all"
              >
                Create Account
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (trip.error === 'private') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl text-center border border-gray-100">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Private Trip</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            This trip is private. Only approved members can view its details. If you have been invited, please ensure you are logged in with the correct account.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] pb-24">
      {/* Hero Image */}
      <div className="relative h-[50vh] min-h-[400px] bg-gray-200 overflow-hidden">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5 }}
          src={trip.cover_image || getDestinationImage(trip.destination_city)}
          alt={trip.destination_city}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
          <button
            onClick={() => navigate('/discover')}
            className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all shadow-2xl"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          {canManageTrip && (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all flex items-center shadow-2xl"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Invite
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all flex items-center shadow-2xl"
              >
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-3 bg-red-500/20 backdrop-blur-xl border border-red-500/30 text-red-200 rounded-2xl hover:bg-red-500/40 transition-all shadow-2xl"
                title="Delete Trip"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-3 mb-6"
            >
              <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                {trip.travel_style?.replace('_', ' ')}
              </span>
              <span className="px-4 py-1.5 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-200 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                {trip.status}
              </span>
              {trip.is_women_only && (
                <span className="px-4 py-1.5 bg-pink-500/20 backdrop-blur-md border border-pink-500/30 text-pink-200 text-[10px] font-black uppercase tracking-[0.2em] rounded-full flex items-center">
                  <Heart className="w-3 h-3 mr-2 fill-pink-200" />
                  Women Only
                </span>
              )}
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-7xl font-black tracking-tight font-serif mb-4"
            >
              {trip.starting_city && (
                <span className="text-2xl md:text-4xl block text-white/80 font-medium mb-2">
                  From {trip.starting_city} to
                </span>
              )}
              {trip.destination_city}, <span className="text-white/70 italic">{trip.destination_country}</span>
            </motion.h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10">
        {/* Trip Summary Bar */}
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:divide-x divide-gray-100">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Dates</span>
                <span className="text-sm font-bold text-gray-900">
                  {new Date(trip.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(trip.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="md:pl-8 flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Spots</span>
                <span className="text-sm font-bold text-gray-900">{trip.current_members}/{trip.max_members} Filled</span>
              </div>
            </div>
            <div className="md:pl-8 flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Budget</span>
                <span className="text-sm font-bold text-gray-900">₹{trip.budget_max.toLocaleString()}</span>
              </div>
            </div>
            <div className="md:pl-8 flex items-center justify-end">
              {!(isOrganizer || memberStatus === 'approved') && memberStatus !== 'pending' && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center"
                >
                  Join Trip <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
              {(isOrganizer || memberStatus === 'approved') && (
                <button
                  onClick={() => navigate(`/messages/${trip.id}`)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center"
                >
                  Group Chat <MessageSquare className="w-4 h-4 ml-2" />
                </button>
              )}
              {memberStatus === 'pending' && (
                <div className="w-full py-4 bg-amber-50 text-amber-600 rounded-2xl font-black uppercase tracking-widest text-[10px] text-center border border-amber-100">
                  Request Pending
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Action Bar (Mobile) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-2xl border-t border-gray-100 z-50 md:hidden flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget</span>
            <span className="text-lg font-black text-gray-900">₹{trip.budget_max.toLocaleString()}</span>
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            {!(isOrganizer || memberStatus === 'approved') ? (
              <button
                disabled={memberStatus === 'pending'}
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none"
              >
                {memberStatus === 'pending' ? 'Pending' : 'Join Now'}
              </button>
            ) : (
              <button
                onClick={() => navigate(`/messages/${trip.id}`)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200"
              >
                Chat
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-gray-100/80 rounded-[2rem] mb-12 w-fit mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${
              activeTab === 'overview' 
                ? 'bg-white text-indigo-600 shadow-xl shadow-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`px-10 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${
              activeTab === 'itinerary' 
                ? 'bg-white text-indigo-600 shadow-xl shadow-gray-200/50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Itinerary
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {activeTab === 'overview' ? (
              <div className="space-y-12">
                <Section title="Route" icon={MapPin}>
                  <div className="flex items-center space-x-6">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="w-1 h-12 bg-gradient-to-b from-indigo-100 to-purple-100 my-2 rounded-full" />
                      <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
                        <MapPin className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex flex-col space-y-10">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Starts From</span>
                        <span className="text-2xl font-black text-gray-900 tracking-tight">{trip.starting_city || 'Not Specified'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Destination</span>
                        <span className="text-2xl font-black text-gray-900 tracking-tight">{trip.destination_city}, {trip.destination_country}</span>
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="About the Trip" icon={Info}>
                  <p className="text-lg text-gray-600 leading-relaxed font-medium">{trip.description}</p>
                </Section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Section title="What's Included" icon={CheckCircle} className="bg-emerald-50/30 border-emerald-100/50">
                    <ul className="space-y-4">
                      {trip.whats_included && Array.isArray(trip.whats_included) ? (
                        trip.whats_included.map((item, i) => (
                          <li key={i} className="flex items-start group">
                            <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : trip.includes ? (
                        trip.includes.split('\n').filter(Boolean).map((item: string, i: number) => (
                          <li key={i} className="flex items-start group">
                            <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 mt-0.5 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-400 italic">No inclusions listed</li>
                      )}
                    </ul>
                  </Section>

                  <Section title="What's Excluded" icon={XCircle} className="bg-red-50/30 border-red-100/50">
                    <ul className="space-y-4">
                      {trip.whats_excluded && Array.isArray(trip.whats_excluded) ? (
                        trip.whats_excluded.map((item, i) => (
                          <li key={i} className="flex items-start group">
                            <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center mr-3 mt-0.5 group-hover:bg-red-500 group-hover:text-white transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : trip.excludes ? (
                        trip.excludes.split('\n').filter(Boolean).map((item: string, i: number) => (
                          <li key={i} className="flex items-start group">
                            <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center mr-3 mt-0.5 group-hover:bg-red-500 group-hover:text-white transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-400 italic">No exclusions listed</li>
                      )}
                    </ul>
                  </Section>
                </div>

                <Section title="Important Notes" icon={AlertCircle} className="bg-amber-50/30 border-amber-100/50">
                  <div className="bg-white p-6 rounded-[2rem] border border-amber-100 shadow-sm flex items-start space-x-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-amber-900 leading-relaxed font-medium">
                      {trip.important_notes || "Please contact the organizer for specific requirements or health considerations."}
                    </p>
                  </div>
                </Section>

                <div className="bg-gray-900 p-10 md:p-16 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
                  <div className="relative z-10 max-w-lg">
                    <h3 className="text-3xl md:text-5xl font-black mb-8 tracking-tight font-serif">Why join this trip?</h3>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex items-center space-x-5 bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <span className="text-lg font-black block">Verified Organizer</span>
                          <span className="text-xs text-white/50 font-bold uppercase tracking-widest">Safety First</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-5 bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <span className="text-lg font-black block">Best Value for Money</span>
                          <span className="text-xs text-white/50 font-bold uppercase tracking-widest">Curated Experience</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]" />
                  <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px]" />
                </div>

                {isOrganizer && members.some(m => m.status === 'pending') && (
                  <Section title="Pending Requests" icon={AlertCircle} className="bg-amber-50/30 border-amber-100/50">
                    <div className="space-y-4">
                      {members.filter(m => m.status === 'pending').map((member) => (
                        <div key={member.uid} className="bg-white p-6 rounded-[2rem] flex items-center justify-between shadow-sm border border-amber-100/50">
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                              {member.photo_url ? (
                                <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <User className="w-7 h-7 text-indigo-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-black text-gray-900 text-lg">{member.name}</h4>
                              <p className="text-xs text-gray-500 font-bold">{member.location_city || 'India'}</p>
                            </div>
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleApproveMember(member.uid)}
                              className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectMember(member.uid)}
                              className="px-6 py-3 bg-white text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 hover:bg-red-50 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                <Section title={`Trip Members (${members.filter(m => m.status === 'approved' || m.isOrganizer).length})`} icon={Users}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {members.filter(m => m.status === 'approved' || m.isOrganizer).map((member) => (
                      <motion.div
                        whileHover={{ y: -5 }}
                        key={member.uid}
                        onClick={() => navigate(`/profile/${member.uid}`)}
                        className="flex flex-col items-center p-6 rounded-[2.5rem] bg-gray-50/50 border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all cursor-pointer group text-center"
                      >
                        <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform overflow-hidden shadow-lg border-2 border-white">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-10 h-10 text-indigo-600" />
                          )}
                        </div>
                        <h4 className="font-black text-gray-900 text-sm tracking-tight mb-1">{member.name}</h4>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{member.location_city || 'India'}</p>
                      </motion.div>
                    ))}
                  </div>
                </Section>
              </div>
            ) : (
              <div className="space-y-12">
                {trip.itinerary && (
                  <CollapsibleCard 
                    title="Itinerary Summary" 
                    icon={MapIcon} 
                    isOpen={expandedSections.itinerary} 
                    onToggle={() => toggleSection('itinerary')}
                    badge={`${parseItinerary(trip.itinerary).length} Days Journey`}
                  >
                    <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                      {parseItinerary(trip.itinerary).map((day, idx) => (
                        <div key={idx} className="relative pl-10">
                          <div className="absolute left-0 top-0 w-8 h-8 bg-white border-2 border-indigo-600 rounded-full flex items-center justify-center z-10">
                            <span className="text-[10px] font-black text-indigo-600">{day.day}</span>
                          </div>
                          <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-200/30 transition-all cursor-pointer group" onClick={() => toggleDay(idx)}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-black text-gray-900 tracking-tight">Day {day.day}</h4>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-500 ${expandedDays[idx] ? 'rotate-180' : ''}`} />
                            </div>
                            {day.title && day.title !== 'Activities' && day.title !== 'Plan' && (
                              <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">{day.title}</p>
                            )}
                            <AnimatePresence>
                              {expandedDays[idx] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="pt-4 border-t border-gray-100 mt-4"
                                >
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-medium">
                                    {day.content}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleCard>
                )}

                <div className="bg-white p-10 md:p-12 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100">
                  <ItineraryPlanner 
                    tripId={id!} 
                    isMember={memberStatus === 'approved' || isOrganizer} 
                    isOrganizer={isOrganizer}
                    initialItinerary={trip.itinerary}
                    destination={trip.destination_city}
                    travelStyle={trip.travel_style}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 sticky top-8">
              <div className="flex items-center space-x-5 mb-8">
                <div className="relative">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    {organizer?.photo_url || trip.organizer_photo_url ? (
                      <img src={organizer?.photo_url || trip.organizer_photo_url} alt={organizer?.name || trip.organizer_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-10 h-10 text-indigo-600" />
                    )}
                  </div>
                  {(organizer?.is_verified || trip.organizer_verified) && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 shadow-lg border-2 border-white" title="Verified Traveler">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Organizer</span>
                  <h4 className="font-black text-gray-900 text-xl leading-tight font-serif">{organizer?.name || trip.organizer_name || 'Loading...'}</h4>
                  <div className="flex items-center mt-2">
                    <div className="flex items-center text-amber-500">
                      <Star className={`w-3.5 h-3.5 mr-1.5 ${organizerRating.totalReviews > 0 ? 'fill-amber-500' : 'text-gray-300'}`} />
                      <span className="text-xs font-black">
                        {organizerRating.totalReviews > 0 ? organizerRating.averageRating : 'New'}
                      </span>
                    </div>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-xs font-bold text-gray-400">{organizerRating.totalReviews} reviews</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <Shield className="w-5 h-5 mr-4 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-600">Verified Identity</span>
                </div>
                <div className="flex items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <MapPin className="w-5 h-5 mr-4 text-indigo-500" />
                  <span className="text-xs font-bold text-gray-600 truncate">{organizer?.location_city || 'India'}, {organizer?.location_country || ''}</span>
                </div>
                <div className="flex items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <Award className="w-5 h-5 mr-4 text-amber-500" />
                  <span className="text-xs font-bold text-gray-600">12 Trips Completed</span>
                </div>
              </div>

              <div className="flex flex-col space-y-4 mb-10">
                <button 
                  onClick={() => navigate(`/profile/${trip.organizer_id}`)}
                  className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm"
                >
                  View Profile
                </button>
                {user && user.uid !== trip.organizer_id && (
                  <button 
                    onClick={handleMessageOrganizer}
                    disabled={messaging}
                    className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-100 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {messaging ? 'Connecting...' : 'Send Message'}
                  </button>
                )}
              </div>

              <div className="pt-8 border-t border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Booking Details</h3>
                
                <div className="space-y-4 mb-8">
                  {(isOrganizer || memberStatus === 'approved') ? (
                    <>
                      <button
                        onClick={() => navigate(`/messages/${trip.id}`)}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all flex items-center justify-center shadow-2xl shadow-indigo-200"
                      >
                        <MessageSquare className="w-5 h-5 mr-3" /> Group Chat
                      </button>
                      <button
                        onClick={() => navigate(`/trips/${trip.id}/expenses`)}
                        className="w-full py-5 bg-emerald-50 text-emerald-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition-all flex items-center justify-center border border-emerald-100"
                      >
                        <IndianRupee className="w-5 h-5 mr-3" /> Expense Split
                      </button>
                    </>
                  ) : memberStatus === 'pending' ? (
                    <div className="w-full py-5 bg-amber-50 text-amber-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] text-center border border-amber-100">
                      Request Pending
                    </div>
                  ) : (trip.settings?.privacy === 'public' || !trip.settings?.privacy) ? (
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all flex items-center justify-center shadow-2xl shadow-indigo-200"
                    >
                      <UserPlus className="w-5 h-5 mr-3" /> Request to Join
                    </button>
                  ) : (
                    <div className="w-full py-5 bg-gray-50 text-gray-400 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] text-center border border-gray-100">
                      Invite Only Trip
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Availability</span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{trip.max_members - trip.current_members} Spots Left</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(trip.current_members / trip.max_members) * 100}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/20" 
                    />
                  </div>
                  <p className="mt-4 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                    {trip.current_members} of {trip.max_members} spots filled
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showJoinModal && (
          <JoinRequestModal
            trip={trip}
            onClose={() => setShowJoinModal(false)}
            onSuccess={() => {
              setShowJoinModal(false);
              setMemberStatus('pending');
            }}
          />
        )}
        {showShareModal && (
          <ShareModal
            trip={trip}
            onClose={() => setShowShareModal(false)}
          />
        )}
        {showEditModal && (
          <EditTripModal
            trip={trip}
            onClose={() => setShowEditModal(false)}
            onSuccess={(updatedTrip) => {
              setTrip(updatedTrip);
              setShowEditModal(false);
            }}
          />
        )}
        <DeleteTripModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteTrip}
          tripName={`${trip.destination_city}, ${trip.destination_country}`}
        />
      </AnimatePresence>
    </div>
  );
};

export default TripDetails;


