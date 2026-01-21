
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
// Fix: Use Room instead of non-existent Venue
import { Room, VenueStatus } from '../types';
import { UCC_BRAND } from '../constants';

interface CampusMapProps {
  // Fix: Prop venues should use Room[]
  venues: Room[];
  onVenueSelect: (venue: Room) => void;
}

const CampusMap: React.FC<CampusMapProps> = ({ venues, onVenueSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // UCC Center Coordinates approximately
    const uccCenter: [number, number] = [5.1054, -1.2821];

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(uccCenter, 15);

    // Using a clean, minimal tile provider
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers if any (for simple implementation we just re-run)
    // In a production app, we'd manage a layer group
    
    venues.forEach(venue => {
      const statusColor = 
        venue.status === VenueStatus.AVAILABLE ? '#22c55e' : 
        venue.status === VenueStatus.OCCUPIED ? '#ef4444' : 
        venue.status === VenueStatus.BOOKED ? '#eab308' : '#64748b';

      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${statusColor};
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          " class="marker-pulse"></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([venue.coordinates.lat, venue.coordinates.lng], { icon: customIcon })
        .addTo(mapRef.current!)
        .on('click', () => onVenueSelect(venue));

      // Optional: Add simple tooltip
      marker.bindTooltip(`
        <div style="font-family: Inter, sans-serif; padding: 4px;">
          <b style="color: #003366;">${venue.name}</b><br/>
          <span style="font-size: 10px; color: #64748b;">CAPACITY: ${venue.capacity}</span>
        </div>
      `, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.9
      });
    });
  }, [venues, onVenueSelect]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full rounded-b-2xl md:rounded-2xl" />
      
      {/* Legend Overlay */}
      <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-2 pointer-events-none">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Status</div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span className="text-[10px] font-bold text-slate-700">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <span className="text-[10px] font-bold text-slate-700">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <span className="text-[10px] font-bold text-slate-700">Booked</span>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;
