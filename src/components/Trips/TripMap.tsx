import React from 'react';
import { MapPin } from 'lucide-react';

interface TripMapProps {
  lat: number;
  lng: number;
  destination: string;
}

export const TripMap: React.FC<TripMapProps> = ({ lat, lng, destination }) => {
  // OpenStreetMap embed URL
  // bbox format: [min Lon, min Lat, max Lon, max Lat]
  const delta = 0.01;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-indigo-600" /> Destination Map
        </h3>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest truncate max-w-[200px]">{destination}</span>
      </div>
      <div className="overflow-hidden rounded-3xl border-4 border-white shadow-xl shadow-gray-200/50 h-[300px] relative bg-gray-100">
        <iframe
          title="Trip Destination Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapUrl}
          className="grayscale-[0.2] contrast-[1.1]"
        />
        <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-gray-500 pointer-events-none">
          © OpenStreetMap contributors
        </div>
      </div>
      <div className="flex justify-end">
        <a 
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
        >
          View larger map
        </a>
      </div>
    </div>
  );
};
