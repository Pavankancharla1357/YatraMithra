import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search, X, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LocationAutocompleteProps {
  onSelect: (location: { name: string; lat: number; lng: number; city?: string; country?: string }) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onSelect,
  placeholder = "Search for a destination...",
  defaultValue = "",
  className = ""
}) => {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recent_locations_osm');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing recent searches", e);
      }
    }
  }, []);

  const saveToRecent = (location: any) => {
    const newRecent = [location, ...recentSearches.filter(s => s.place_id !== location.place_id)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recent_locations_osm', JSON.stringify(newRecent));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      // Nominatim API - Free, no key required
      // Restricting to India (countrycodes=in) and cities/towns
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=5`,
        { signal: abortControllerRef.current.signal }
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching locations:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    setIsOpen(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => searchLocations(val), 300);
    return () => clearTimeout(timeoutId);
  };

  const handleSelect = (location: any) => {
    const name = location.display_name;
    setValue(name);
    setSuggestions([]);
    setIsOpen(false);
    saveToRecent(location);

    const address = location.address;
    const city = address.city || 
                 address.town || 
                 address.village || 
                 address.municipality || 
                 address.city_district || 
                 address.district || 
                 address.county || 
                 address.state_district || 
                 location.display_name.split(',')[0];
    
    const country = address.country;

    onSelect({
      name,
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon),
      city,
      country
    });
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </div>
        <input
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          className="w-full pl-11 pr-10 py-3.5 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-sm text-gray-900 placeholder:text-gray-400"
          onFocus={() => setIsOpen(true)}
        />
        {value && (
          <button
            onClick={() => {
              setValue("");
              setSuggestions([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || (value === "" && recentSearches.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <ul className="py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {value === "" && recentSearches.length > 0 && (
                <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 flex items-center">
                  <History className="w-3 h-3 mr-2" /> Recent Searches
                </div>
              )}
              {(value === "" ? recentSearches : suggestions).map((loc, idx) => (
                <li
                  key={loc.place_id || idx}
                  onClick={() => handleSelect(loc)}
                  className="px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors flex items-start space-x-3 group"
                >
                  <div className="mt-0.5 p-1.5 bg-gray-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <MapPin className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {loc.address.city || 
                       loc.address.town || 
                       loc.address.village || 
                       loc.address.municipality || 
                       loc.address.city_district || 
                       loc.address.district || 
                       loc.address.county || 
                       loc.address.state_district || 
                       loc.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{loc.display_name}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Powered by OpenStreetMap</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
