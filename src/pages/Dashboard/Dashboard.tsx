import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useAuth } from '../../components/Auth/AuthContext';
import { createNotification } from '../../services/notificationService';
import { TripCard } from '../../components/Trips/TripCard';
import { LayoutDashboard, Plane, MessageSquare, Bell, ChevronRight, Star, Heart, Zap, Plus, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

import { subscribeToUserRating } from '../../services/reviewService';

export const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const [myTrips, setMyTrips] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [rating, setRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribeRating = subscribeToUserRating(user.uid, (newRating) => {
      setRating(newRating);
    });

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch trips organized by user
        const tripsQ = query(collection(db, 'trips'), where('organizer_id', '==', user.uid));
        const tripsSnapshot = await getDocs(tripsQ);
        const tripsData = tripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyTrips(tripsData);

        // Fetch pending requests for user's trips
        if (tripsData.length > 0) {
          const tripIds = tripsData.map(t => t.id);
          const requestsQ = query(
            collection(db, 'trip_members'), 
            where('trip_id', 'in', tripIds),
            where('status', '==', 'pending')
          );
          const requestsSnapshot = await getDocs(requestsQ);
          
          // Parallel fetch all user profiles for these requests
          const requestsData = await Promise.all(
            requestsSnapshot.docs.map(async (docSnap) => {
              const data = docSnap.data();
              // Try to fetch user profile for more accurate name
              const userDoc = await getDoc(doc(db, 'users', data.user_id));
              const userData = userDoc.exists() ? userDoc.data() : null;
              return { 
                id: docSnap.id, 
                ...data,
                user_name: userData?.name || data.user_name || 'Traveler'
              };
            })
          );
          setRequests(requestsData);
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    return () => unsubscribeRating();
  }, [user]);

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected', tripId: string) => {
    try {
      const requestRef = doc(db, 'trip_members', requestId);
      const requestSnap = await getDoc(requestRef);
      const requestData = requestSnap.data();
      
      await updateDoc(requestRef, { status: action });
      
      if (action === 'approved') {
        // Increment current_members in trip
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        const tripData = tripSnap.data();
        
        await updateDoc(tripRef, {
          current_members: increment(1)
        });

        // Notify traveler
        if (requestData) {
          await createNotification(
            requestData.user_id,
            'request_accepted',
            'Request Approved!',
            `Your request to join the trip to ${tripData?.destination_city} has been approved.`,
            `/trips/${tripId}`
          );
        }
      } else if (action === 'rejected') {
        // Notify traveler
        if (requestData) {
          const tripRef = doc(db, 'trips', tripId);
          const tripSnap = await getDoc(tripRef);
          const tripData = tripSnap.data();
          
          await createNotification(
            requestData.user_id,
            'trip_updated',
            'Request Update',
            `Your request to join the trip to ${tripData?.destination_city} was not accepted at this time.`,
            `/discover`
          );
        }
      }
      
      // Refresh requests
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error(`Error ${action} request:`, error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded w-64" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </div>
            <div className="w-48 h-14 bg-gray-200 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] h-64 shadow-xl" />
              <div className="bg-white p-8 rounded-[2.5rem] h-96 shadow-xl" />
            </div>
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] h-80 shadow-xl" />
                <div className="bg-white p-8 rounded-[2.5rem] h-80 shadow-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-gray-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-red-500">
            <Bell className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Dashboard Error</h3>
          <p className="text-gray-500 mb-10 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isAndroid ? 'pb-32' : 'pb-20'}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isAndroid ? 'py-6 pt-safe' : 'py-12'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 sm:mb-12 gap-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              {isAndroid ? 'Dashboard' : `Welcome back, ${profile?.name}`}
            </h1>
            <p className="text-sm sm:text-lg text-gray-500 mt-1 sm:mt-2">
              {isAndroid ? `Hi ${profile?.name}, here's your travel summary.` : "Here's what's happening with your travels."}
            </p>
          </div>
          {!isAndroid && (
            <Link
              to="/trips/create"
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center"
            >
              <Plane className="w-5 h-5 mr-2" /> Create New Trip
            </Link>
          )}
        </div>

        {isAndroid && (
          <Link
            to="/trips/create"
            className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats & Quick Actions */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <Star className="text-indigo-600 w-8 h-8 fill-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{rating.totalReviews > 0 ? rating.averageRating : 'New'}</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Average Rating ({rating.totalReviews})</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center">
                    <Plane className="w-5 h-5 text-indigo-600 mr-3" />
                    <span className="font-bold text-gray-700">Active Trips</span>
                  </div>
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-indigo-600 shadow-sm">{myTrips.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center">
                    <Bell className="w-5 h-5 text-amber-500 mr-3" />
                    <span className="font-bold text-gray-700">Pending Requests</span>
                  </div>
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-amber-600 shadow-sm">{requests.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="text-indigo-600 w-8 h-8 fill-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Travel Vault</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Document Scanner</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-6 font-medium">Scan your tickets and IDs. Our AI extracts and organizes your travel documents securely.</p>
              <Link
                to="/document-vault"
                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
              >
                Open Vault
              </Link>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
                  <Heart className="text-rose-600 w-8 h-8 fill-rose-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Travel Matcher</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Compatibility Check</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-6 font-medium">Find out if you and your travel buddy are a perfect match before you fly.</p>
              <Link
                to="/travel-matcher"
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                Check Match
              </Link>
            </div>

            {/* Pending Requests List */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Join Requests</h3>
              {requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900">{req.user_name || 'A traveler'}</span>
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">wants to join: {req.trip_name || `Trip ${req.trip_id.slice(0, 8)}`}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 italic">"{req.request_message}"</p>
                      <div className="mt-4 flex space-x-2">
                        <button 
                          onClick={() => handleRequestAction(req.id, 'approved', req.trip_id)}
                          className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRequestAction(req.id, 'rejected', req.trip_id)}
                          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-50 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-sm text-gray-400">No pending requests at the moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* My Trips List */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-bold text-gray-900">Your Trips</h3>
              <Link to="/discover" className="text-indigo-600 font-bold text-sm hover:underline">View All</Link>
            </div>
            
            {myTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plane className="text-gray-300 w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">You haven't created any trips yet</h3>
                <p className="text-gray-500 max-w-xs mx-auto mb-8">Start your first adventure and find companions to join you.</p>
                <Link
                  to="/trips/create"
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                >
                  Create Your First Trip
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
