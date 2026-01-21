
import React from 'react';
import { Room, VenueStatus } from '../types';
import { AMENITIES, BUILDINGS } from '../constants';
import { Users, MapPin, CheckCircle, XCircle, AlertCircle, Clock, CalendarSearch, Wind, Monitor, Zap, Mic, Projector, Accessibility } from 'lucide-react';

interface VenueCardProps {
  venue: Room;
  onClick: (venue: Room) => void;
  onAvailabilityCheck?: (venue: Room) => void;
}

const VenueCard: React.FC<VenueCardProps> = ({ venue, onClick, onAvailabilityCheck }) => {
  const building = BUILDINGS.find(b => b.id === venue.buildingId);
  
  const getStatusIcon = (status: VenueStatus) => {
    switch (status) {
      case VenueStatus.AVAILABLE: return <CheckCircle size={16} className="text-green-500" />;
      case VenueStatus.OCCUPIED: return <XCircle size={16} className="text-red-500" />;
      case VenueStatus.BOOKED: return <Clock size={16} className="text-yellow-500" />;
      case VenueStatus.MAINTENANCE: return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusClass = (status: VenueStatus) => {
    switch (status) {
      case VenueStatus.AVAILABLE: return 'bg-green-100 text-green-800';
      case VenueStatus.OCCUPIED: return 'bg-red-100 text-red-800';
      case VenueStatus.BOOKED: return 'bg-yellow-100 text-yellow-800';
      case VenueStatus.MAINTENANCE: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAmenityIcon = (id: string) => {
    switch (id) {
      case 'a1': return <Projector size={12} />;
      case 'a2': return <Wind size={12} />;
      case 'a4': return <Mic size={12} />;
      case 'a5': return <Monitor size={12} />;
      case 'a6': return <Accessibility size={12} />;
      case 'a7': return <Zap size={12} />;
      default: return null;
    }
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group active:scale-[0.99]"
    >
      <div className="relative h-40 overflow-hidden cursor-pointer" onClick={() => onClick(venue)}>
        <img 
          src={venue.image} 
          alt={venue.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm ${getStatusClass(venue.status)}`}>
          {getStatusIcon(venue.status)}
          {venue.status}
        </div>
      </div>
      <div className="p-4">
        <div className="cursor-pointer" onClick={() => onClick(venue)}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-900 line-clamp-1">{venue.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{building?.name || 'Main Campus'}</p>
            </div>
            <span className="bg-slate-50 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-bold">{venue.type}</span>
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-slate-500 text-xs">
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{venue.capacity}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>Floor {venue.floor}</span>
            </div>
          </div>

          <div className="flex gap-1.5 mt-3">
            {venue.amenityIds.slice(0, 4).map(aid => (
              <div key={aid} title={AMENITIES.find(a => a.id === aid)?.name} className="p-1 bg-slate-50 rounded text-slate-400">
                {getAmenityIcon(aid)}
              </div>
            ))}
            {venue.amenityIds.length > 4 && <div className="text-[9px] font-bold text-slate-300 self-center">+{venue.amenityIds.length - 4}</div>}
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <button 
            onClick={() => onAvailabilityCheck?.(venue)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <CalendarSearch size={14} />
            Availability
          </button>
          <button 
            onClick={() => onClick(venue)}
            className="bg-[#003366] text-white px-3 py-2 rounded-lg text-[11px] font-bold hover:bg-blue-900 transition-colors"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenueCard;
