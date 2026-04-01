import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../Auth/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Users, ChevronRight, Plane, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';

interface Trip {
  id: string;
  destination_city: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'full' | 'ongoing' | 'completed' | 'cancelled';
  organizer_id: string;
  current_members: number;
  max_members: number;
  cover_url?: string;
}

interface TripMember {
  trip_id: string;
  role: 'organizer' | 'member';
  status: 'pending' | 'approved' | 'rejected' | 'left';
}

export const MyTrips: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<(Trip & { role: string; memberStatus: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const membersQuery = query(
      collection(db, 'trip_members'),
      where('user_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(membersQuery, async (snapshot) => {
      try {
        const tripPromises = snapshot.docs.map(async (memberDoc) => {
          const memberData = memberDoc.data() as TripMember;
          const tripRef = doc(db, 'trips', memberData.trip_id);
          const tripSnap = await getDoc(tripRef);
          
          if (tripSnap.exists()) {
            return {
              id: tripSnap.id,
              ...(tripSnap.data() as Trip),
              role: memberData.role,
              memberStatus: memberData.status
            };
          }
          return null;
        });

        const resolvedTrips = (await Promise.all(tripPromises)).filter(t => t !== null) as (Trip & { role: string; memberStatus: string })[];
        setTrips(resolvedTrips.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()));
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'trip_members');
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trip_members');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Loading your journeys...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Plane className="w-10 h-10 text-gray-300" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">No trips yet</h3>
        <p className="text-gray-500 text-sm font-medium mb-8 max-w-xs mx-auto">
          Your travel story is waiting to be written. Start by discovering or creating a trip!
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/discover')}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg transition-all"
          >
            Discover Trips
          </button>
          <button
            onClick={() => navigate('/trips/create')}
            className="px-8 py-3 bg-white text-indigo-600 border-2 border-indigo-50 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all"
          >
            Create a Trip
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-emerald-500';
      case 'open': return 'bg-indigo-500';
      case 'full': return 'bg-amber-500';
      case 'completed': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <AnimatePresence mode="popLayout">
        {trips.map((trip) => (
          <motion.div
            key={trip.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => navigate(`/trips/${trip.id}`)}
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer overflow-hidden flex flex-col sm:flex-row"
          >
            {/* Trip Image/Placeholder */}
            <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-gray-100 overflow-hidden">
              {trip.cover_url ? (
                <img 
                  src={trip.cover_url} 
                  alt={trip.destination_city}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50">
                  <MapPin className="w-10 h-10 text-indigo-200" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-lg ${getStatusColor(trip.status)}`}>
                  {trip.status}
                </div>
              </div>
            </div>

            {/* Trip Info */}
            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {trip.destination_city}, {trip.destination_country}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {trip.role === 'organizer' ? (
                        <div className="flex items-center space-x-1 text-indigo-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Organizer</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-gray-400">
                          <Users className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Member</span>
                        </div>
                      )}
                      {trip.memberStatus === 'pending' && (
                        <div className="flex items-center space-x-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Pending Approval</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Dates</p>
                      <p className="text-xs font-bold text-gray-700">
                        {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Group</p>
                      <p className="text-xs font-bold text-gray-700">{trip.current_members}/{trip.max_members} Members</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {/* We could fetch member avatars here, but for now just a placeholder */}
                  {[...Array(Math.min(trip.current_members, 3))].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200" />
                  ))}
                  {trip.current_members > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-400">
                      +{trip.current_members - 3}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  View Details <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
