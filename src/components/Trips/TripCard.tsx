import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, IndianRupee, Star, Zap, User, Check, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../Auth/AuthContext';
import { subscribeToUserRating } from '../../services/reviewService';

interface TripCardProps {
  trip: any;
}

export const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const { profile } = useAuth();
  const [organizerRating, setOrganizerRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToUserRating(trip.organizer_id, (rating) => {
      setOrganizerRating(rating);
    });
    return () => unsubscribe();
  }, [trip.organizer_id]);
  
  const getDestinationImage = (city: string) => {
    const cityLower = city.toLowerCase();
    const images: Record<string, string> = {
      'leh': 'https://images.unsplash.com/photo-1581791534721-e599df4417f7?auto=format&fit=crop&w=800&q=80',
      'ladakh': 'https://images.unsplash.com/photo-1581791534721-e599df4417f7?auto=format&fit=crop&w=800&q=80',
      'manali': 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
      'nandi hills': 'https://images.unsplash.com/photo-1600100397608-f010f423b971?auto=format&fit=crop&w=800&q=80',
      'goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      'jaipur': 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80',
      'udaipur': 'https://images.unsplash.com/photo-1585129819171-806f086600fd?auto=format&fit=crop&w=800&q=80',
      'mumbai': 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&w=800&q=80',
      'delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80',
      'bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
      'bengaluru': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
      'kerala': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
      'rishikesh': 'https://images.unsplash.com/photo-1598977123418-45205553f40e?auto=format&fit=crop&w=800&q=80',
      'bali': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
      'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
      'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
      'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80',
      'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
    };

    // Check for exact match or partial match
    for (const [key, url] of Object.entries(images)) {
      if (cityLower.includes(key)) return url;
    }

    // High-quality generic travel fallback
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';
  };

  const calculateCompatibility = () => {
    if (!profile?.vibe_quiz_results || !trip.organizer_vibe) return null;
    
    const userVibe = profile.vibe_quiz_results;
    const organizerVibe = trip.organizer_vibe;
    
    let score = 0;
    let total = 0;
    
    Object.keys(userVibe).forEach(key => {
      if (organizerVibe[key]) {
        const diff = Math.abs(userVibe[key] - organizerVibe[key]);
        score += (5 - diff);
        total += 5;
      }
    });
    
    return total > 0 ? Math.round((score / total) * 100) : null;
  };

  const compatibility = calculateCompatibility();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 border border-gray-100 transition-all group"
    >
      <Link to={`/trips/${trip.id}`}>
        <div className="relative h-48 bg-gray-200">
          <img
            src={trip.cover_image || getDestinationImage(trip.destination_city)}
            alt={trip.destination_city}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 left-4 flex flex-col space-y-2">
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
                {trip.travel_style?.replace('_', ' ')}
              </span>
              {compatibility && (
                <span className="px-3 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center">
                  <Zap className="w-3 h-3 mr-1 fill-white" />
                  {compatibility}% Match
                </span>
              )}
            </div>
            {trip.is_women_only && (
              <span className="px-3 py-1 bg-pink-500/90 backdrop-blur-sm text-white text-[10px] font-extrabold rounded-full uppercase tracking-widest shadow-sm flex items-center self-start">
                <Heart className="w-3 h-3 mr-1 fill-white" />
                Women Only
              </span>
            )}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-sm">
              <div className="flex items-center space-x-1">
                <Star className={`w-3 h-3 ${organizerRating.totalReviews > 0 ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                <span className="text-xs font-bold text-gray-900">
                  {organizerRating.totalReviews > 0 ? organizerRating.averageRating : 'New'}
                </span>
                {organizerRating.totalReviews > 0 && (
                  <span className="text-[10px] text-gray-400 font-medium">({organizerRating.totalReviews})</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {trip.destination_city}, {trip.destination_country}
            </h3>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-gray-500 text-sm">
              <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
              <span>{new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center text-gray-500 text-sm">
              <Users className="w-4 h-4 mr-2 text-indigo-500" />
              <span>{trip.current_members}/{trip.max_members} members</span>
            </div>
            <div className="flex items-center text-gray-500 text-sm">
              <IndianRupee className="w-4 h-4 mr-2 text-indigo-500" />
              <span>Max Budget: ₹{trip.budget_max}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <Link to={`/profile/${trip.organizer_id}`} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center overflow-hidden">
                {trip.organizer_photo_url ? (
                  <img src={trip.organizer_photo_url} alt={trip.organizer_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-4 h-4 text-indigo-600" />
                )}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs font-medium text-gray-600">{trip.organizer_name || 'Organizer'}</span>
                {trip.organizer_verified && (
                  <div className="bg-blue-500 rounded-full p-0.5 shadow-sm" title="Verified Traveler">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                )}
              </div>
            </Link>
            <span className="text-indigo-600 font-bold text-sm">View Details</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
