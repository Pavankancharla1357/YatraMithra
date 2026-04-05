import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc, getDoc, documentId } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { createNotification } from '../../services/notificationService';
import { X, Send, Plane, Calendar, MapPin, Check, Copy, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface InviteToTripModalProps {
  targetUser: any;
  onClose: () => void;
}

export const InviteToTripModal: React.FC<InviteToTripModalProps> = ({ targetUser, onClose }) => {
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invitedTrips, setInvitedTrips] = useState<Set<string>>(new Set());
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchMyTrips = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (!db) throw new Error('Database not initialized');
      console.log('--- fetchMyTrips Start ---');
      console.log('User UID:', user.uid);
      
      // 1. Fetch all trip memberships for the user
      console.log('Querying trip_members...');
      const memberQ = query(
        collection(db, 'trip_members'),
        where('user_id', '==', user.uid)
      );
      
      let memberSnapshot;
      try {
        memberSnapshot = await getDocs(memberQ);
        console.log('Member docs found:', memberSnapshot.size);
      } catch (err: any) {
        console.error('Error querying trip_members:', err);
        throw new Error(`Permission denied for trip_members: ${err.message}`);
      }
      
      // 2. Filter for approved memberships
      const approvedTripIds = memberSnapshot.docs
        .filter(doc => doc.data().status === 'approved')
        .map(doc => doc.data().trip_id)
        .filter(id => !!id);
      console.log('Approved trip IDs:', approvedTripIds);
      
      // 3. Also get trips where user is organizer
      console.log('Querying trips as organizer...');
      const organizerQ = query(
        collection(db, 'trips'),
        where('organizer_id', '==', user.uid)
      );
      
      let organizerSnapshot;
      try {
        organizerSnapshot = await getDocs(organizerQ);
        console.log('Organizer trips found:', organizerSnapshot.size);
      } catch (err: any) {
        console.error('Error querying trips as organizer:', err);
        throw new Error(`Permission denied for organized trips: ${err.message}`);
      }
      
      const organizerTripIds = organizerSnapshot.docs.map(doc => doc.id);
      console.log('Organizer trip IDs:', organizerTripIds);
      
      // 4. Combine and fetch trip details
      const allTripIds = Array.from(new Set([...approvedTripIds, ...organizerTripIds])).filter(id => !!id);
      console.log('Unique trip IDs to fetch:', allTripIds);
      
      if (allTripIds.length === 0) {
        console.log('No trips found for user');
        setMyTrips([]);
        setLoading(false);
        return;
      }

      // Fetch trips individually to be more robust and avoid query limits/errors
      console.log('Fetching trip details individually...');
      const tripPromises = allTripIds.slice(0, 30).map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'trips', id));
          if (!snap.exists()) {
            console.warn(`Trip ${id} does not exist`);
            return null;
          }
          return { id: snap.id, ...snap.data() };
        } catch (err: any) {
          console.error(`Error fetching trip ${id}:`, err);
          // Don't throw here, just skip this trip
          return null;
        }
      });
      
      const tripsData = (await Promise.all(tripPromises))
        .filter((trip): trip is any => trip !== null)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.start_date || 0).getTime();
          const dateB = new Date(b.start_date || 0).getTime();
          return dateB - dateA; // Newest first
        });

      console.log('Final trips data loaded:', tripsData.length);
      console.log('--- fetchMyTrips End ---');
      setMyTrips(tripsData);
      if (tripsData.length > 0) {
        toast.success(`Found ${tripsData.length} trips`);
      }
    } catch (error: any) {
      console.error('Error in fetchMyTrips:', error);
      toast.error('Failed to load your trips: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTrips();
  }, [user]);

  const handleInvite = async (trip: any) => {
    if (!user || !targetUser) return;
    
    setInviting(trip.id);
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      if (!trip.invite_code) {
        toast.error('This trip is missing an invite code. Please ask the organizer to visit the trip page first.');
        return;
      }

      // Create an invitation document in trip_invites
      await setDoc(doc(db, 'trip_invites', token), {
        trip_id: trip.id,
        inviter_id: user.uid,
        token: token,
        invite_code: trip.invite_code,
        expires_at: expiresAt.toISOString(),
        created_at: serverTimestamp()
      });

      const inviteLink = `${window.location.origin}/invite/${token}`;
      setGeneratedLink(inviteLink);
      
      // Send notification to target user
      await createNotification(
        targetUser.uid,
        'trip_invitation',
        'Trip Invitation',
        `${currentUserProfile?.name || user.displayName || 'A traveler'} invited you to join their trip to ${trip.destination_city}.`,
        `/invite/${token}`
      );

      setInvitedTrips(prev => new Set(prev).add(trip.id));
      toast.success('Invitation link generated!');
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setInviting(null);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!generatedLink) return;
    const text = `Hey! Join my trip to ${myTrips.find(t => invitedTrips.has(t.id))?.destination_city} on YatraMitra: ${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-900">Invite to Trip</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Invite {targetUser.name} to one of your adventures</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {generatedLink ? (
            <div className="space-y-6 py-4">
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-emerald-900">Invite Sent!</h4>
                <p className="text-xs text-emerald-600 font-bold mt-1 uppercase tracking-widest">Share this link with {targetUser.name}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <input 
                    type="text" 
                    readOnly 
                    value={generatedLink}
                    className="bg-transparent border-none text-xs font-medium text-gray-500 flex-1 focus:ring-0"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={shareToWhatsApp}
                    className="flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
                  >
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500 font-medium">Loading your trips...</p>
            </div>
          ) : myTrips.length > 0 ? (
            myTrips.map((trip) => (
              <div key={trip.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Plane className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{trip.destination_city}</h4>
                    <div className="flex items-center space-x-3 mt-1">
                      <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(trip.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        <MapPin className="w-3 h-3 mr-1" />
                        {trip.destination_country}
                      </div>
                    </div>
                  </div>
                </div>
                
                {invitedTrips.has(trip.id) ? (
                  <div className="flex items-center text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-3 py-2 rounded-lg">
                    <Check className="w-3 h-3 mr-1.5" /> Invited
                  </div>
                ) : (
                  <button
                    onClick={() => handleInvite(trip)}
                    disabled={inviting === trip.id}
                    className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {inviting === trip.id ? '...' : 'Invite'}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Plane className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium mb-6">You don't have any active trips to invite people to.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/trips/create');
                  }}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                  Create a Trip
                </button>
                <button
                  onClick={fetchMyTrips}
                  className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
