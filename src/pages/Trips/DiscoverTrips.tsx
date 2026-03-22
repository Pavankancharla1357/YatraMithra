import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { TripCard } from '../../components/Trips/TripCard';
import { Search, Filter, MapPin, Calendar as CalendarIcon, SlidersHorizontal, Compass, Plane, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { CustomSelect } from '../../components/UI/CustomSelect';
import { CustomDatePicker } from '../../components/UI/CustomDatePicker';

export const DiscoverTrips: React.FC = () => {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    maxBudget: '',
    travelStyle: '',
  });

  const travelStyleOptions = [
    { value: '', label: 'All Styles' },
    { value: 'budget', label: 'Budget' },
    { value: 'mid_range', label: 'Mid-Range' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'backpacking', label: 'Backpacking' },
  ];

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const q = query(collection(db, 'trips'), where('status', '==', 'open'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        const tripsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTrips(tripsData);
      } catch (error) {
        console.error('Error fetching trips:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.destination_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.destination_country.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || (trip.trip_types && trip.trip_types.includes(selectedTag));
    
    const matchesStartDate = !filters.startDate || new Date(trip.start_date) >= new Date(filters.startDate);
    const matchesEndDate = !filters.endDate || new Date(trip.end_date) <= new Date(filters.endDate);
    const matchesBudget = !filters.maxBudget || trip.budget_max <= parseInt(filters.maxBudget);
    const matchesStyle = !filters.travelStyle || trip.travel_style === filters.travelStyle;

    return matchesSearch && matchesTag && matchesStartDate && matchesEndDate && matchesBudget && matchesStyle;
  });

  const tags = ['Budget', 'Adventure', 'Trekking', 'Nature', 'Luxury', 'Culture', 'Backpacking', 'Relaxation', 'Foodie'];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Discover Adventures</h1>
            <Link
              to="/trips/create"
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center"
            >
              <Plane className="w-5 h-5 mr-2" /> Create New Trip
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Where to next?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-6 py-4 border rounded-2xl font-bold transition-all ${
                showFilters ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filters
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-6">
            {tags.map(tag => (
              <button 
                key={tag} 
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedTag === tag 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-visible"
              >
                <div className="mt-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-6">
                  <CustomDatePicker
                    label="Start Date"
                    selected={filters.startDate ? new Date(filters.startDate) : null}
                    onChange={(date) => setFilters({ ...filters, startDate: date ? date.toISOString() : '' })}
                    placeholder="From date"
                  />
                  <CustomDatePicker
                    label="End Date"
                    selected={filters.endDate ? new Date(filters.endDate) : null}
                    onChange={(date) => setFilters({ ...filters, endDate: date ? date.toISOString() : '' })}
                    placeholder="To date"
                  />
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Max Budget (INR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={filters.maxBudget}
                      onChange={(e) => setFilters({ ...filters, maxBudget: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none hover:border-indigo-300 transition-all"
                    />
                  </div>
                  <CustomSelect
                    label="Travel Style"
                    value={filters.travelStyle}
                    onChange={(val) => setFilters({ ...filters, travelStyle: val })}
                    options={travelStyleOptions}
                    placeholder="All Styles"
                  />
                  <div className="md:col-span-4 flex justify-end">
                    <button 
                      onClick={() => setFilters({ startDate: '', endDate: '', maxBudget: '', travelStyle: '' })}
                      className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredTrips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Compass className="text-gray-400 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No trips found</h3>
            <p className="text-gray-500">Try adjusting your search or filters to find more adventures.</p>
          </div>
        )}
      </div>
    </div>
  );
};
