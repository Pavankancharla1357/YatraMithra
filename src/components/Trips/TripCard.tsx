import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, IndianRupee, Star, Zap, User, Check, Heart, Eye, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../Auth/AuthContext';
import { subscribeToUserRating } from '../../services/reviewService';

interface TripCardProps {
  trip: any;
}

export const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const { user, profile } = useAuth();
  const [organizerRating, setOrganizerRating] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToUserRating(trip.organizer_id, (rating) => {
      setOrganizerRating(rating);
    });
    return () => unsubscribe();
  }, [trip.organizer_id]);
  
  const getDestinationImage = (city: string) => {
    if (!city) return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80';
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
      'rishikesh': 'https://images.unsplash.com/photo-1598977123418-45454503889a?auto=format&fit=crop&w=800&q=80',
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

  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on the organizer profile
    if ((e.target as HTMLElement).closest('.organizer-link')) {
      return;
    }
    navigate(`/trips/${trip.id}`);
  };

  const handleOrganizerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${trip.organizer_id}`);
  };

  const [isSaved, setIsSaved] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (user && trip.members?.includes(user.uid)) {
      setIsJoined(true);
    }
    // In a real app, we'd check join_requests collection for hasRequested
  }, [user, trip.members]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: `Join me on a trip to ${trip.destination_city}!`,
        text: trip.description,
        url: window.location.origin + `/trips/${trip.id}`,
      });
    }
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/trips/${trip.id}`);
  };

  const getCTAButton = () => {
    if (isJoined) {
      return (
        <button 
          className="px-8 py-4 bg-emerald-500/10 text-emerald-600 rounded-2xl font-black text-xs flex items-center gap-2 border border-emerald-500/20"
          disabled
        >
          <Check className="w-4 h-4" /> Joined
        </button>
      );
    }
    if (hasRequested) {
      return (
        <button 
          className="px-8 py-4 bg-amber-500/10 text-amber-600 rounded-2xl font-black text-xs border border-amber-500/20"
          disabled
        >
          Requested
        </button>
      );
    }
    return (
      <button 
        className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-xs hover:shadow-xl hover:shadow-indigo-500/40 transition-all active:scale-95 group/btn relative overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/trips/${trip.id}`);
        }}
      >
        <span className="relative z-10">View Details</span>
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ 
        y: -8, 
        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.12), 0 18px 36px -18px rgba(0,0,0,0.15)' 
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={handleCardClick}
      className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 transition-all group cursor-pointer flex flex-col h-full relative"
    >
      <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
        <img
          src={trip.cover_image || getDestinationImage(trip.destination_city)}
          alt={trip.destination_city}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Quick Actions Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 z-20">
          <button 
            onClick={handleSave}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all backdrop-blur-md border ${isSaved ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20' : 'bg-white/80 text-gray-900 border-white/50 hover:bg-white'}`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={handlePreview}
            className="w-10 h-10 bg-white/80 backdrop-blur-md border border-white/50 text-gray-900 rounded-xl flex items-center justify-center hover:bg-white transition-all"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button 
            onClick={handleShare}
            className="w-10 h-10 bg-white/80 backdrop-blur-md border border-white/50 text-gray-900 rounded-xl flex items-center justify-center hover:bg-white transition-all"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md text-indigo-600 text-[9px] font-black rounded-lg uppercase tracking-widest shadow-sm">
              {trip.travel_style?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl text-white border border-white/10 text-[10px] font-bold">
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{organizerRating.totalReviews > 0 ? organizerRating.averageRating : '4.8'}</span>
            </div>
          </div>
          {compatibility && (
            <div className="bg-indigo-600/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-black uppercase tracking-wider flex items-center shadow-lg">
              <Zap className="w-3 h-3 mr-1 fill-white" />
              {compatibility}% Match
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 tracking-tight flex-1 mr-2">
            {trip.destination_city}, {trip.destination_country}
          </h3>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">From</div>
            <div className="text-lg font-black text-indigo-600 flex items-center justify-end">
              <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
              {trip.budget_max}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mb-6 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
            <span>{new Date(trip.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
            <span>{trip.current_members}/{trip.max_members}</span>
          </div>
        </div>
        
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
          <div 
            onClick={handleOrganizerClick}
            className="organizer-link flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="relative">
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center overflow-hidden border border-indigo-100">
                {trip.organizer_photo_url ? (
                  <img src={trip.organizer_photo_url} alt={trip.organizer_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-4 h-4 text-indigo-400" />
                )}
              </div>
              {trip.organizer_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-md p-0.5 shadow-sm border border-white">
                  <Check className="w-2 h-2 text-white" strokeWidth={5} />
                </div>
              )}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-black text-gray-900 truncate max-w-[80px]">{trip.organizer_name?.split(' ')[0] || 'Host'}</div>
            </div>
          </div>
          {getCTAButton()}
        </div>
      </div>
    </motion.div>
  );
};
