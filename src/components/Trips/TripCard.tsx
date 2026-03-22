import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, IndianRupee, Star, Zap, User, Check, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../Auth/AuthContext';

interface TripCardProps {
  trip: any;
}

export const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const { profile } = useAuth();
  
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
            src={trip.cover_image || `https://picsum.photos/seed/${trip.destination_city}/800/600`}
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
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-gray-900">4.8</span>
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
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs font-medium text-gray-600">{trip.organizer_name || 'Organizer'}</span>
                {trip.organizer_verified && (
                  <div className="bg-blue-500 rounded-full p-0.5 shadow-sm" title="Verified Traveler">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                  </div>
                )}
              </div>
            </div>
            <span className="text-indigo-600 font-bold text-sm">View Details</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
