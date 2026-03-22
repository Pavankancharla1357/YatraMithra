import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { JoinRequestModal } from '../../components/Trips/JoinRequestModal';
import { EditTripModal } from '../../components/Trips/EditTripModal';
import { ItineraryPlanner } from '../../components/Trips/ItineraryPlanner';
import { Calendar, Users, IndianRupee, MapPin, ChevronLeft, Shield, Star, MessageSquare, UserPlus, Check, Edit2, User, LayoutGrid, Map as MapIcon, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary'>('overview');

  useEffect(() => {
    if (!id) return;

    const fetchTripData = async () => {
      try {
        const tripDoc = await getDoc(doc(db, 'trips', id));
        if (tripDoc.exists()) {
          const tripData: any = { id: tripDoc.id, ...tripDoc.data() };
          setTrip(tripData);

          // Fetch organizer profile
          const orgDoc = await getDoc(doc(db, 'users', tripData.organizer_id));
          if (orgDoc.exists()) {
            setOrganizer(orgDoc.data());
          }

          // Fetch trip members
          const membersQ = query(
            collection(db, 'trip_members'),
            where('trip_id', '==', id),
            where('status', '==', 'approved')
          );
          const membersSnapshot = await getDocs(membersQ);
          const memberUids = membersSnapshot.docs.map(doc => doc.data().user_id);
          
          const memberProfiles = await Promise.all(
            memberUids.map(async (uid) => {
              const userDoc = await getDoc(doc(db, 'users', uid));
              return userDoc.exists() ? { uid, ...userDoc.data() } : null;
            })
          );
          setMembers(memberProfiles.filter(p => p !== null));

          // Check current user's membership status
          if (user) {
            const q = query(
              collection(db, 'trip_members'),
              where('trip_id', '==', id),
              where('user_id', '==', user.uid)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              setMemberStatus(snapshot.docs[0].data().status);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching trip details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [id, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center">Trip not found</div>;

  const isOrganizer = user?.uid === trip.organizer_id;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Hero Image */}
      <div className="relative h-96 bg-gray-200">
        <img
          src={trip.cover_image || `https://picsum.photos/seed/${trip.destination_city}/1920/1080`}
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
        
        {isOrganizer && (
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute top-6 right-6 px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold shadow-xl hover:bg-gray-50 transition-all flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-2" /> Edit Trip
          </button>
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
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                          <User className="w-6 h-6 text-indigo-600" />
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
                <ItineraryPlanner tripId={id!} isMember={memberStatus === 'approved' || isOrganizer} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Organizer</h3>
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <User className="w-8 h-8 text-indigo-600" />
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
              <button 
                onClick={() => navigate(`/profile/${trip.organizer_id}`)}
                className="w-full py-3 border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all"
              >
                View Profile
              </button>
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
      </AnimatePresence>
    </div>
  );
};


