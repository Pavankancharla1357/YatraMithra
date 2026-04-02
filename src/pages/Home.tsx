import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Compass, Users, Shield, MapPin, ArrowRight, Star, Globe, Heart, CheckCircle, Plane, Camera, MessageSquare, Sparkles, IndianRupee, Calendar, Plus, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/Auth/AuthContext';
import { TripCard } from '../components/Trips/TripCard';
import { db } from '../firebase';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';

export const Home: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [liveTrips, setLiveTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/discover');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchLiveTrips = async () => {
      setTripsLoading(true);
      try {
        // Fetch public, open trips
        const q = query(
          collection(db, 'trips'),
          where('status', '==', 'open'),
          where('settings.privacy', '==', 'public'),
          limit(3)
        );
        const snapshot = await getDocs(q);
        const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLiveTrips(trips);
      } catch (error) {
        console.error("Error fetching live trips:", error);
      } finally {
        setTripsLoading(false);
      }
    };

    fetchLiveTrips();
  }, []);

  if (authLoading) return null;
  if (user) return null;

  const destinations = [
    { name: 'Jaipur, Rajasthan', image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', tag: 'Heritage' },
    { name: 'Munnar, Kerala', image: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=800&q=80', tag: 'Nature' },
    { name: 'Hampi, Karnataka', image: 'https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=800&q=80', tag: 'History' },
    { name: 'Varanasi, UP', image: 'https://images.unsplash.com/photo-1598977123118-4e30ba3c4f5b?auto=format&fit=crop&w=800&q=80', tag: 'Spiritual' },
  ];

  const steps = [
    { icon: <Globe className="w-6 h-6" />, title: 'Create Profile', desc: 'Tell us about your travel style and where you want to go in India.' },
    { icon: <Users className="w-6 h-6" />, title: 'Find Buddies', desc: 'Browse trips or find travelers with matching vibes across the country.' },
    { icon: <Plane className="w-6 h-6" />, title: 'Travel Together', desc: 'Coordinate, pack your bags, and start your Indian adventure.' },
  ];

  const testimonials = [
    { name: 'Ananya S.', role: 'Solo Traveler', text: 'Found my best friend and travel buddy for a 2-week trek in Himachal. Best decision ever!', avatar: 'https://i.pravatar.cc/150?img=32' },
    { name: 'Rahul M.', role: 'Adventure Seeker', text: 'The verification system gave me peace of mind. Had an amazing group trip to Spiti Valley.', avatar: 'https://i.pravatar.cc/150?img=11' },
    { name: 'Priya K.', role: 'Culture Enthusiast', text: 'Perfect for finding people to share costs and experiences while exploring the Ghats of Varanasi.', avatar: 'https://i.pravatar.cc/150?img=44' },
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (searchDate) params.set('date', searchDate);
    navigate(`/discover?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 pb-32 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1920&q=80" 
            alt="India Travel Hero" 
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-white/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center lg:text-left lg:max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center px-4 py-2 mb-8 text-sm font-black tracking-widest text-indigo-400 uppercase bg-white/10 backdrop-blur-md rounded-full border border-white/10 shadow-2xl"
              >
                <Sparkles className="w-4 h-4 mr-2" /> India's Travel Social Network
              </motion.span>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-[0.9] mb-8">
                Find Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 animate-gradient-x">Travel Tribe.</span>
              </h1>
              <p className="text-xl md:text-3xl text-gray-200 mb-12 font-medium leading-relaxed max-w-2xl drop-shadow-lg">
                Discover trips, connect with like-minded travelers, and never travel alone again. 
              </p>

              {/* Interactive Search Box */}
              <div className="relative max-w-4xl group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white/90 backdrop-blur-2xl p-2 md:p-3 rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col md:flex-row items-center gap-2 mb-8">
                  <div className="flex-1 w-full flex items-center px-6 py-4 gap-4 border-b md:border-b-0 md:border-r border-gray-200/50 focus-within:bg-white/50 transition-colors rounded-t-[2rem] md:rounded-l-full md:rounded-tr-none">
                    <MapPin className="text-indigo-500 w-6 h-6 shrink-0" />
                    <div className="flex flex-col items-start w-full">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Destination</span>
                      <input 
                        type="text" 
                        placeholder="Try Goa, Manali, Ladakh..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 w-full font-bold text-lg focus:ring-0"
                      />
                    </div>
                  </div>
                  <div className="flex-1 w-full flex items-center px-6 py-4 gap-4 focus-within:bg-white/50 transition-colors">
                    <Calendar className="text-indigo-500 w-6 h-6 shrink-0" />
                    <div className="flex flex-col items-start w-full">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dates</span>
                      <input 
                        type="date" 
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                        className="bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 w-full font-bold text-lg focus:ring-0"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2">
                    <button 
                      onClick={handleSearch}
                      className="w-full md:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/40 flex items-center justify-center group active:scale-95"
                    >
                      Find Trips
                    </button>
                    <Link
                      to="/trips/create"
                      className="w-full md:w-auto px-8 py-5 bg-white border-2 border-indigo-600 text-indigo-600 rounded-[1.8rem] font-black text-lg hover:bg-indigo-50 transition-all flex items-center justify-center active:scale-95"
                    >
                      <Plus className="w-5 h-5 mr-2" /> Create
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="flex items-center gap-3 px-6 py-3 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-white font-black text-sm tracking-wide">🔥 120+ travelers joined this week</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs font-black uppercase tracking-widest">Trending:</span>
                  <div className="flex gap-2">
                    {['Goa', 'Rishikesh', 'Ladakh'].map((city) => (
                      <button 
                        key={city}
                        onClick={() => setSearchQuery(city)}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white text-xs font-bold transition-all"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Trips Section */}
      <section className="py-24 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="flex items-center gap-2 text-rose-500 font-black uppercase tracking-widest text-sm mb-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                Live Trips
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight">Ongoing Adventures</h2>
              <p className="text-gray-500 text-lg font-medium mt-4">Join active groups and start your journey today.</p>
            </div>
            <Link to="/discover" className="inline-flex items-center px-8 py-4 bg-gray-50 text-gray-900 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all border border-gray-100">
              View All Trips <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {tripsLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-gray-50 rounded-[2.5rem] h-96 animate-pulse" />
              ))
            ) : liveTrips.length > 0 ? (
              liveTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                <Compass className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No live trips available at the moment.</p>
                <Link to="/trips/create" className="text-indigo-600 font-bold mt-2 inline-block hover:underline">
                  Be the first to create one!
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Buddy Finder Section */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <div className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <Users className="w-4 h-4 mr-2" /> Buddy Finder
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6">Find Your Perfect Travel Partner</h2>
            <p className="text-gray-500 text-xl font-medium leading-relaxed">Connect with travelers who share your interests and travel style.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "Aarav Sharma", style: "Backpacker", interests: ["Hiking", "Photography"], img: "https://i.pravatar.cc/150?img=11", verified: true },
              { name: "Ishani Gupta", style: "Luxury", interests: ["Culture", "Food"], img: "https://i.pravatar.cc/150?img=32", verified: true },
              { name: "Vikram Singh", style: "Mid Range", interests: ["Road Trips", "History"], img: "https://i.pravatar.cc/150?img=12", verified: false },
              { name: "Zoya Khan", style: "Budget", interests: ["Solo Travel", "Art"], img: "https://i.pravatar.cc/150?img=44", verified: true }
            ].map((buddy, i) => (
              <motion.div 
                key={i}
                whileHover={{ 
                  y: -15,
                  boxShadow: '0 40px 80px -15px rgba(79, 70, 229, 0.2)',
                  borderColor: 'rgba(79, 70, 229, 0.3)'
                }}
                className="bg-white p-10 rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-100 text-center group transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50" />
                
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <div className="absolute inset-0 bg-indigo-600 rounded-[2.5rem] rotate-6 group-hover:rotate-12 transition-transform duration-500 opacity-10" />
                  <img src={buddy.img} className="relative w-full h-full rounded-[2.5rem] object-cover shadow-2xl group-hover:scale-105 transition-transform duration-500" alt={buddy.name} />
                  {buddy.verified && (
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2.5 rounded-2xl shadow-lg border-4 border-white z-10">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">{buddy.name}</h3>
                <div className="text-indigo-600 text-xs font-black uppercase tracking-widest mb-6">{buddy.style} Traveler</div>
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                  {buddy.interests.map((interest, idx) => (
                    <span key={idx} className="px-4 py-1.5 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-full border border-gray-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                      {interest}
                    </span>
                  ))}
                </div>
                <Link 
                  to="/buddy-finder"
                  className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-indigo-600 transition-all shadow-xl active:scale-95 flex items-center justify-center group/btn"
                >
                  Start Chat
                </Link>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-20 text-center">
            <Link to="/buddy-finder" className="inline-flex items-center px-10 py-5 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all group">
              Meet More Travelers <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32 bg-gray-50 rounded-[5rem] mx-4 sm:mx-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-24"
          >
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6">How It Works</h2>
            <p className="text-gray-500 text-xl font-medium">Your journey from solo to tribe in 4 simple steps.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
            {[
              { icon: <MapPin className="w-10 h-10" />, title: "Choose Destination", desc: "Pick where you want to go or browse existing trips." },
              { icon: <Globe className="w-10 h-10" />, title: "Find or Create", desc: "Join an existing group or start your own adventure." },
              { icon: <Users className="w-10 h-10" />, title: "Connect", desc: "Meet like-minded travelers and check compatibility." },
              { icon: <MessageSquare className="w-10 h-10" />, title: "Chat & Travel", desc: "Coordinate via group chat and hit the road!" }
            ].map((step, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="text-center relative group"
              >
                {i < 3 && (
                  <div className="hidden lg:block absolute top-12 left-1/2 w-full h-px border-t-4 border-dashed border-indigo-100 -z-0" />
                )}
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl shadow-indigo-100 flex items-center justify-center mx-auto mb-10 relative z-10 text-indigo-600 border border-gray-50 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500"
                >
                  {step.icon}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-xl group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                    {i + 1}
                  </div>
                </motion.div>
                <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">{step.title}</h3>
                <p className="text-gray-500 text-lg font-medium leading-relaxed px-4">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6">Everything You Need</h2>
            <p className="text-gray-500 text-xl font-medium">Designed for the modern social traveler.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              { icon: <Users className="w-8 h-8" />, color: "indigo", title: "🤝 Travel Matchmaking", desc: "Connect with verified travelers who match your vibe, interests, and travel style." },
              { icon: <Globe className="w-8 h-8" />, color: "emerald", title: "🌍 Trip Discovery", desc: "Browse hundreds of community-led trips across India and join the one that fits you." },
              { icon: <MessageSquare className="w-8 h-8" />, color: "amber", title: "💬 Group Chat", desc: "Coordinate everything from packing lists to meeting points in dedicated trip chats." },
              { icon: <IndianRupee className="w-8 h-8" />, color: "rose", title: "💰 Budget Split", desc: "Track group expenses and split costs fairly without the awkward conversations." },
              { icon: <Shield className="w-8 h-8" />, color: "blue", title: "🔐 Document Vault", desc: "Keep your tickets and IDs safe and accessible for the whole group when needed." },
              { icon: <Sparkles className="w-8 h-8" />, color: "purple", title: "🤖 AI Planner", desc: "Need help with the itinerary? Our AI assistant can suggest the best routes and spots." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ 
                  y: -15,
                  boxShadow: '0 40px 80px -15px rgba(0, 0, 0, 0.1)',
                }}
                className="bg-white p-12 rounded-[3.5rem] shadow-xl shadow-gray-100 border border-gray-100 group transition-all duration-500 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${feature.color}-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50`} />
                <div className={`w-20 h-20 bg-${feature.color}-50 text-${feature.color}-600 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-${feature.color}-100`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-6">{feature.title}</h3>
                <p className="text-gray-600 text-lg font-medium leading-relaxed">{feature.desc}</p>
                <div className={`mt-8 w-12 h-1.5 bg-${feature.color}-500 rounded-full group-hover:w-24 transition-all duration-500`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="py-32 bg-gray-900 text-white rounded-[5rem] overflow-hidden relative mx-4 sm:mx-8 shadow-3xl shadow-black/50">
        <div className="absolute inset-0 opacity-20">
          <img src="https://www.transparenttextures.com/patterns/cubes.png" alt="pattern" className="w-full h-full" />
        </div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-600/20 via-transparent to-purple-600/20" />
        
        <div className="max-w-7xl mx-auto px-6 sm:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-indigo-400 font-black uppercase tracking-[0.3em] text-xs mb-8 border border-white/10">
                <Shield className="w-4 h-4 mr-2" /> Trust & Safety
              </span>
              <h2 className="text-5xl md:text-7xl font-black mb-10 leading-[0.9] tracking-tighter">Travel with <br />Peace of Mind</h2>
              <p className="text-2xl text-gray-400 font-medium mb-16 leading-relaxed max-w-xl">
                Your safety is our priority. We've built multiple layers of trust to ensure you have the best experience.
              </p>
              <div className="space-y-12">
                {[
                  { icon: <CheckCircle className="w-8 h-8 text-emerald-400" />, title: "Verified Profiles", desc: "Every traveler goes through a multi-step verification process." },
                  { icon: <Star className="w-8 h-8 text-amber-400" />, title: "Ratings & Reviews", desc: "Build your reputation and check others' travel history before joining." },
                  { icon: <Shield className="w-8 h-8 text-indigo-400" />, title: "Secure Group Chats", desc: "Connect safely within the platform before sharing personal details." }
                ].map((item, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className="flex gap-8 group"
                  >
                    <div className="shrink-0 mt-1 p-5 bg-white/5 rounded-3xl group-hover:bg-indigo-600/20 transition-all duration-500 border border-white/5 group-hover:border-indigo-500/30 group-hover:scale-110">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black mb-3 text-white group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                      <p className="text-gray-500 text-lg font-medium leading-relaxed max-w-md">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative lg:pl-12"
            >
              {/* Trust Metrics Card */}
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-16 rounded-[4rem] shadow-3xl shadow-indigo-500/30 relative overflow-hidden group border border-white/10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full -ml-32 -mb-32 blur-3xl" />
                
                <div className="relative z-10 space-y-12">
                  <div className="flex items-center justify-between border-b border-white/10 pb-10">
                    <div>
                      <div className="text-7xl font-black mb-3 tracking-tighter">4.8</div>
                      <div className="flex text-amber-400 mb-3 gap-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-current" />)}
                      </div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100 opacity-80">Average Rating</div>
                    </div>
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl"
                    >
                      <Heart className="w-12 h-12 text-white fill-white/20" />
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-12">
                    <div className="group/stat">
                      <div className="text-5xl font-black mb-2 tracking-tighter group-hover/stat:scale-110 transition-transform origin-left">10k+</div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100 opacity-80">Happy Travelers</div>
                    </div>
                    <div className="group/stat">
                      <div className="text-5xl font-black mb-2 tracking-tighter group-hover/stat:scale-110 transition-transform origin-left">500+</div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100 opacity-80">Trips Completed</div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-white/10">
                    <motion.div 
                      whileHover={{ x: 10 }}
                      className="flex items-center gap-6 bg-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl border border-white/20 shadow-2xl group/badge transition-all"
                    >
                      <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl group-hover/badge:rotate-12 transition-transform">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-black mb-1">100% Verified</div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Community Safety First</div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Floating Animation Badge */}
              <motion.div 
                animate={{ y: [0, -20, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-12 -right-12 bg-white p-10 rounded-[3.5rem] shadow-4xl hidden xl:block border border-gray-100 z-20"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center shadow-inner">
                    <CheckCircle className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-gray-900 text-3xl font-black tracking-tighter">Trusted</div>
                    <div className="text-gray-400 text-xs font-black uppercase tracking-widest">By 10,000+ Members</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-24"
          >
            <div className="inline-flex items-center px-4 py-2 bg-amber-50 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <Star className="w-4 h-4 mr-2 fill-current" /> Testimonials
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6">What Our Tribe Says</h2>
            <p className="text-gray-500 text-xl font-medium">Real stories from real travelers who found their tribe.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {testimonials.map((t, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ y: -15 }}
                className="bg-gray-50 p-12 rounded-[3.5rem] relative group transition-all duration-500 border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-4xl shadow-indigo-100/20"
              >
                <div className="absolute -top-6 left-12 w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 text-white">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="flex text-amber-400 mb-8 gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-gray-700 text-xl font-medium leading-relaxed italic mb-10">"{t.text}"</p>
                <div className="flex items-center gap-5">
                  <img src={t.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-xl" alt={t.name} />
                  <div>
                    <div className="text-gray-900 font-black text-lg">{t.name}</div>
                    <div className="text-indigo-600 text-xs font-black uppercase tracking-widest">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent -z-10" />
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-indigo-600 rounded-[5rem] p-16 md:p-32 relative overflow-hidden shadow-4xl shadow-indigo-500/20 group"
          >
            <div className="absolute inset-0 opacity-30 mix-blend-overlay group-hover:scale-110 transition-transform duration-1000">
              <img 
                src="https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80" 
                alt="India Footer BG" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-600/80 to-purple-700/90" />
            
            <div className="relative z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-5xl md:text-8xl font-black text-white mb-10 leading-[0.9] tracking-tighter">Start Your Next <br />Journey with Your Tribe</h2>
                <p className="text-indigo-100 text-2xl md:text-3xl font-medium mb-16 max-w-3xl mx-auto leading-relaxed">
                  Stop waiting for friends to be free. Find your perfect travel partners today.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                  <Link
                    to="/discover"
                    className="w-full sm:w-auto px-16 py-7 bg-white text-indigo-600 rounded-[2rem] font-black text-2xl hover:bg-indigo-50 transition-all shadow-2xl active:scale-95"
                  >
                    Join a Trip
                  </Link>
                  <Link
                    to="/trips/create"
                    className="w-full sm:w-auto px-16 py-7 bg-indigo-950 text-white rounded-[2rem] font-black text-2xl hover:bg-black transition-all border-2 border-white/10 active:scale-95"
                  >
                    Create Your Trip
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-6 left-6 right-6 z-50 md:hidden">
        <motion.button
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/discover')}
          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-3xl shadow-indigo-500/40 flex items-center justify-center gap-3 border border-white/20 backdrop-blur-md"
        >
          <Search className="w-6 h-6" /> Find Trips
        </motion.button>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Compass className="text-white w-7 h-7" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-gray-900">YatraMitra</span>
          </div>
          <div className="flex space-x-8 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600">Privacy</a>
            <a href="#" className="hover:text-indigo-600">Terms</a>
            <a href="#" className="hover:text-indigo-600">Contact</a>
          </div>
          <div className="text-gray-400 text-sm font-medium">
            © 2026 YatraMitra. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
