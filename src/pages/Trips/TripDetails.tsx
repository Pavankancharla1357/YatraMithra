import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  deleteDoc 
} from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { JoinRequestModal } from '../../components/Trips/JoinRequestModal';
import { EditTripModal } from '../../components/Trips/EditTripModal';
import { DeleteTripModal } from '../../components/Trips/DeleteTripModal';
import { ItineraryPlanner } from '../../components/Trips/ItineraryPlanner';
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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

export const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary'>('overview');
  const [messaging, setMessaging] = useState(false);

  const getDestinationImage = (city: string) => {
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
      'rishikesh': 'https://images.unsplash.com/photo-1598977123418-45205553f40e?auto=format&fit=crop&w=1920&q=80',
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
          sender_name: 'WanderMatch Bot',
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

        // Fetch all members for this trip
        const membersQuery = query(collection(db, 'trip_members'), where('trip_id', '==', id));
        const membersSnap = await getDocs(membersQuery);
        
        // Set current user's membership status
        if (user) {
          const myMemberDoc = membersSnap.docs.find(d => d.data().user_id === user.uid);
          if (myMemberDoc) {
            setMemberStatus(myMemberDoc.data().status);
          }
        }

        // Identify approved members (excluding organizer for now to handle separately)
        const approvedMemberIds = membersSnap.docs
          .filter(d => d.data().status === 'approved' && d.data().user_id !== tripData.organizer_id)
          .map(d => d.data().user_id);

        // Fetch profiles in parallel
        const profilePromises = [
          getDoc(doc(db, 'users', tripData.organizer_id)),
          ...approvedMemberIds.map(uid => getDoc(doc(db, 'users', uid)))
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
          if (pSnap.exists()) {
            allMembers.push({ uid: pSnap.id, ...pSnap.data() });
          } else {
            allMembers.push({
              uid: approvedMemberIds[i-1],
              name: 'Traveler',
              photo_url: null,
              is_verified: false
            });
          }
        }

        setMembers(allMembers);

      } catch (error) {
        console.error('Error fetching trip details:', error);
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

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Hero Image */}
      <div className="relative h-96 bg-gray-200">
        <img
          src={trip.cover_image || getDestinationImage(trip.destination_city)}
          alt={trip.destination_city}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        {canManageTrip && (
          <div className="absolute top-6 right-6 flex space-x-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold shadow-xl hover:bg-gray-50 transition-all flex items-center"
            >
              <Edit2 className="w-4 h-4 mr-2" /> Edit Trip
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-3 bg-red-500/80 backdrop-blur-md text-white rounded-2xl font-bold shadow-xl hover:bg-red-600 transition-all flex items-center"
              title="Delete Trip"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        {/* Tabs */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-8 py-4 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl ${
              activeTab === 'overview' 
                ? 'bg-indigo-600 text-white shadow-indigo-100' 
                : 'bg-white text-gray-500 hover:bg-gray-50 shadow-gray-200/50'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`px-8 py-4 rounded-2xl font-bold flex items-center space-x-2 transition-all shadow-xl ${
              activeTab === 'itinerary' 
                ? 'bg-indigo-600 text-white shadow-indigo-100' 
                : 'bg-white text-gray-500 hover:bg-gray-50 shadow-gray-200/50'
            }`}
          >
            <MapIcon className="w-5 h-5" />
            <span>Itinerary</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {activeTab === 'overview' ? (
              <>
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">
                      {trip.travel_style?.replace('_', ' ')}
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full uppercase tracking-wider">
                      {trip.status}
                    </span>
                    {trip.is_women_only && (
                      <span className="px-3 py-1 bg-pink-50 text-pink-600 text-xs font-bold rounded-full uppercase tracking-wider flex items-center">
                        <Heart className="w-3 h-3 mr-1 fill-pink-600" />
                        Women Only
                      </span>
                    )}
                  </div>
                  <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                    {trip.destination_city}, {trip.destination_country}
                  </h1>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dates</span>
                      <div className="flex items-center text-sm font-bold text-gray-900">
                        <Calendar className="w-4 h-4 mr-2 text-indigo-600" />
                        {new Date(trip.start_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Budget</span>
                      <div className="flex items-center text-sm font-bold text-gray-900">
                        <IndianRupee className="w-4 h-4 mr-2 text-indigo-600" />
                        ₹{trip.budget_max}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Group Size</span>
                      <div className="flex items-center text-sm font-bold text-gray-900">
                        <Users className="w-4 h-4 mr-2 text-indigo-600" />
                        {trip.max_members} max
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</span>
                      <div className="flex items-center text-sm font-bold text-indigo-600">
                        <Check className="w-4 h-4 mr-2" />
                        {trip.status}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Trip Description</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {trip.description}
                    </p>
                  </div>

                  {trip.itinerary && (
                    <div className="mt-8 pt-8 border-t border-gray-50">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Initial Itinerary</h3>
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">
                          {trip.itinerary}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Trip Members ({members.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {members.map((member) => (
                      <div
                        key={member.uid}
                        onClick={() => navigate(`/profile/${member.uid}`)}
                        className="flex items-center p-4 rounded-2xl border border-gray-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform overflow-hidden">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-6 h-6 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{member.name}</h4>
                          <p className="text-xs text-gray-500">{member.location_city || 'India'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
                <ItineraryPlanner 
                  tripId={id!} 
                  isMember={memberStatus === 'approved' || isOrganizer} 
                  isOrganizer={isOrganizer}
                  initialItinerary={trip.itinerary}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Organizer</h3>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden">
                  {organizer?.photo_url || trip.organizer_photo_url ? (
                    <img src={organizer?.photo_url || trip.organizer_photo_url} alt={organizer?.name || trip.organizer_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-8 h-8 text-indigo-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-gray-900">{organizer?.name || trip.organizer_name || 'Loading...'}</h4>
                    {(organizer?.is_verified || trip.organizer_verified) && (
                      <div className="bg-blue-500 rounded-full p-0.5 shadow-sm" title="Verified Traveler">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center text-amber-500">
                    <Star className="w-3 h-3 fill-amber-500 mr-1" />
                    <span className="text-xs font-bold">4.9 (24 reviews)</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="w-4 h-4 mr-2 text-emerald-500" />
                  <span>Verified Identity</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>{organizer?.location_city || 'India'}, {organizer?.location_country || ''}</span>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <button 
                  onClick={() => navigate(`/profile/${trip.organizer_id}`)}
                  className="w-full py-3 border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  View Profile
                </button>
                {user && user.uid !== trip.organizer_id && (
                  <button 
                    onClick={handleMessageOrganizer}
                    disabled={messaging}
                    className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-100 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {messaging ? 'Connecting...' : 'Message'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Action</h3>
              </div>
              
              {isOrganizer ? (
                <button
                  onClick={() => navigate(`/messages/${trip.id}`)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center"
                >
                  <MessageSquare className="w-5 h-5 mr-2" /> Group Chat
                </button>
              ) : memberStatus === 'approved' ? (
                <button
                  onClick={() => navigate(`/messages/${trip.id}`)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center"
                >
                  <MessageSquare className="w-5 h-5 mr-2" /> Group Chat
                </button>
              ) : memberStatus === 'pending' ? (
                <div className="w-full py-4 bg-amber-50 text-amber-600 rounded-2xl font-bold text-center border border-amber-100">
                  Request Pending
                </div>
              ) : (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center shadow-lg shadow-indigo-100"
                >
                  <UserPlus className="w-5 h-5 mr-2" /> Request to Join
                </button>
              )}
              
              <p className="mt-4 text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                {trip.current_members} of {trip.max_members} spots filled
              </p>
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


