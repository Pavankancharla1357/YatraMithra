import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc, increment, setDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { Plane, Calendar, MapPin, Users, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export const InvitePage = () => {
  const { token } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) return;
      try {
        const q = query(collection(db, 'trip_invites'), where('token', '==', token));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setError('Invalid or expired invitation link.');
          setLoading(false);
          return;
        }

        const inviteData = snapshot.docs[0].data();
        const expiresAt = new Date(inviteData.expires_at);
        
        if (expiresAt < new Date()) {
          setError('This invitation link has expired.');
          setLoading(false);
          return;
        }

        setInvite(inviteData);

        // Fetch trip details
        const tripDoc = await getDoc(doc(db, 'trips', inviteData.trip_id));
        if (!tripDoc.exists()) {
          setError('The trip associated with this invite no longer exists.');
        } else {
          setTrip({ id: tripDoc.id, ...tripDoc.data() });
        }
      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('Failed to load invitation.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleJoin = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/invite/${token}` } });
      return;
    }

    if (!trip) return;

    setJoining(true);
    try {
      // Check if already a member
      const memberId = `${user.uid}_${trip.id}`;
      const memberDoc = await getDoc(doc(db, 'trip_members', memberId));
      
      if (memberDoc.exists()) {
        toast.info('You are already a member of this trip!');
        navigate(`/trips/${trip.id}`);
        return;
      }

      // Add to trip_members
      await setDoc(doc(db, 'trip_members', memberId), {
        trip_id: trip.id,
        user_id: user.uid,
        user_name: profile?.name || user.displayName || 'Traveler',
        user_photo_url: profile?.photo_url || user.photoURL || null,
        role: 'member',
        status: 'approved',
        invite_token: token,
        invite_code: invite?.invite_code || null,
        joined_at: serverTimestamp()
      });

      // Update trip member count
      await updateDoc(doc(db, 'trips', trip.id), {
        current_members: increment(1)
      });

      toast.success('Successfully joined the trip!');
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      console.error('Error joining trip:', err);
      toast.error('Failed to join trip. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-500 font-medium mb-8">{error}</p>
          <button 
            onClick={() => navigate('/discover')}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all"
          >
            Explore Other Trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative h-48 bg-indigo-600 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            </div>
            <div className="relative text-center text-white p-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plane className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">You're Invited!</h1>
              <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest mt-1">Join an exclusive adventure</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-900 leading-tight">
                  Trip to {trip.destination_city}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-2 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                  <MapPin className="w-3 h-3" />
                  {trip.destination_country}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dates</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(trip.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(trip.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Members</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {trip.current_members} / {trip.max_members} Joined
                  </p>
                </div>
              </div>

              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3">About this trip</h4>
                <p className="text-sm text-indigo-700 font-medium leading-relaxed">
                  {trip.description}
                </p>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {joining ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {user ? 'Join Trip Now' : 'Login to Join'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                This invitation expires on {new Date(invite.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
