
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Calendar, 
  Search, 
  Bell, 
  User as UserIcon, 
  Filter,
  Plus,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  MapPin,
  Users,
  RefreshCw,
  Clock,
  CheckCircle,
  Database,
  X,
  CalendarDays,
  CalendarSearch,
  Wind,
  Monitor,
  Zap,
  Mic,
  Projector,
  Accessibility,
  Building,
  Repeat,
  AlertTriangle,
  Navigation,
  SlidersHorizontal
} from 'lucide-react';
import { ROOMS, MOCK_SCHEDULE, BUILDINGS, CAMPUSES, AMENITIES, today } from './constants';
import { Room, VenueStatus, User as UserType, Booking, Amenity, RecurrenceType } from './types';
import VenueCard from './components/VenueCard';
import Assistant from './components/Assistant';
import CampusMap from './components/CampusMap';
import { checkBookingOverlap } from './services/schedulingService';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'venues' | 'map' | 'bookings' | 'profile'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<Room | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Persistence: Initialize bookings from localStorage
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('ucc_venuehub_bookings');
    return saved ? JSON.parse(saved) : MOCK_SCHEDULE;
  });

  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [isAvailabilityViewOpen, setIsAvailabilityViewOpen] = useState(false);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    onlyAvailable: false,
    hasPlugPoints: false,
    minCapacity: 0,
    sortByProximity: false
  });

  const [bookingFormData, setBookingFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '10:00',
    purpose: '',
    type: 'Event' as Booking['type'],
    recurrence: 'None' as RecurrenceType,
    recurrenceEndDate: ''
  });
  
  const [user, setUser] = useState<UserType>(() => {
    const saved = localStorage.getItem('ucc_venuehub_user');
    return saved ? JSON.parse(saved) : {
      id: '1',
      universityId: 'u1',
      name: 'Samuel Mensah',
      role: 'Lecturer',
      email: 'smensah@ucc.edu.gh',
      sisLinked: true,
      calendarLinked: false,
      department: 'Computer Science & IT',
      lastSynced: '2 mins ago'
    };
  });

  // Save bookings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ucc_venuehub_bookings', JSON.stringify(bookings));
  }, [bookings]);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ucc_venuehub_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Geolocation error:', err)
      );
    }
  }, []);

  const filteredRooms = useMemo(() => {
    let result = ROOMS.filter(r => {
      const building = BUILDINGS.find(b => b.id === r.buildingId);
      const campus = CAMPUSES.find(c => c.id === building?.campusId);
      
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             building?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             campus?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAvailability = filters.onlyAvailable ? r.status === VenueStatus.AVAILABLE : true;
      const matchesPlugs = filters.hasPlugPoints ? r.amenityIds.includes('a7') : true;
      const matchesCapacity = r.capacity >= filters.minCapacity;

      return matchesSearch && matchesAvailability && matchesPlugs && matchesCapacity;
    });

    if (filters.sortByProximity && userCoords) {
      result = [...result].sort((a, b) => {
        const distA = calculateDistance(userCoords.lat, userCoords.lng, a.coordinates.lat, a.coordinates.lng);
        const distB = calculateDistance(userCoords.lat, userCoords.lng, b.coordinates.lat, b.coordinates.lng);
        return distA - distB;
      });
    }

    return result;
  }, [searchTerm, filters, userCoords]);

  const stats = {
    available: ROOMS.filter(r => r.status === VenueStatus.AVAILABLE).length,
    occupied: ROOMS.filter(r => r.status === VenueStatus.OCCUPIED).length,
    booked: ROOMS.filter(r => r.status === VenueStatus.BOOKED).length,
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setUser(prev => ({ ...prev, lastSynced: 'Just now' }));
    }, 1500);
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;
    setConflictError(null);

    const partialBooking: Partial<Booking> = {
      roomId: selectedVenue.id,
      date: bookingFormData.date,
      startTime: bookingFormData.startTime,
      endTime: bookingFormData.endTime,
      recurrence: bookingFormData.recurrence,
      recurrenceEndDate: bookingFormData.recurrenceEndDate || undefined
    };

    const conflict = checkBookingOverlap(partialBooking, bookings);
    if (conflict) {
      setConflictError(`Conflict detected with "${conflict.purpose}" starting at ${conflict.startTime}.`);
      return;
    }

    const newBooking: Booking = {
      id: `b-${Date.now()}`,
      roomId: selectedVenue.id,
      roomName: selectedVenue.name,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      date: bookingFormData.date,
      startTime: bookingFormData.startTime,
      endTime: bookingFormData.endTime,
      purpose: bookingFormData.purpose || 'Seminar',
      type: bookingFormData.type,
      status: 'Confirmed',
      source: 'Manual',
      recurrence: bookingFormData.recurrence,
      recurrenceEndDate: bookingFormData.recurrenceEndDate || undefined
    };

    setBookings(prev => [newBooking, ...prev]);
    setIsBookingFormOpen(false);
    setSelectedVenue(null);
    setView('bookings');
  };

  const openAvailabilityCheck = (venue: Room) => {
    setSelectedVenue(venue);
    setIsAvailabilityViewOpen(true);
  };

  const venueBookingsOnDate = useMemo(() => {
    if (!selectedVenue) return [];
    return bookings.filter(b => {
      if (b.roomId !== selectedVenue.id) return false;
      const checkDateObj = new Date(checkDate);
      const startDateObj = new Date(b.date);
      const endDateObj = b.recurrenceEndDate ? new Date(b.recurrenceEndDate) : null;
      if (checkDateObj < startDateObj) return false;
      if (endDateObj && checkDateObj > endDateObj) return false;
      if (b.recurrence === 'None') return b.date === checkDate;
      if (b.recurrence === 'Daily') return true;
      if (b.recurrence === 'Weekly') return checkDateObj.getDay() === startDateObj.getDay();
      return false;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [bookings, selectedVenue, checkDate]);

  const getAmenityIcon = (id: string) => {
    switch (id) {
      case 'a1': return <Projector size={16} />;
      case 'a2': return <Wind size={16} />;
      case 'a4': return <Mic size={16} />;
      case 'a5': return <Monitor size={16} />;
      case 'a6': return <Accessibility size={16} />;
      case 'a7': return <Zap size={16} />;
      default: return <CheckCircle2 size={16} />;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Akwaaba, {user.name.split(' ')[0]}</h2>
          <div className="flex items-center gap-2 mt-1">
             <div className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
               <Database size={10} /> SIS Connected
             </div>
             <p className="text-slate-400 text-[10px] font-medium uppercase">Last Synced: {user.lastSynced}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
            <div className="text-green-600 font-bold text-2xl">{stats.available}</div>
            <div className="text-green-700 text-[10px] font-medium uppercase tracking-wider">Available</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
            <div className="text-red-600 font-bold text-2xl">{stats.occupied}</div>
            <div className="text-red-700 text-[10px] font-medium uppercase tracking-wider">Occupied</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
            <div className="text-yellow-600 font-bold text-2xl">{stats.booked}</div>
            <div className="text-yellow-700 text-[10px] font-medium uppercase tracking-wider">Booked</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">My Schedule Today</h3>
          <button onClick={() => setView('bookings')} className="text-[#003366] text-xs font-bold flex items-center gap-1">
            VIEW FULL CALENDAR <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {bookings.filter(b => b.userId === user.id || b.source === 'SIS').slice(0, 2).map(booking => (
            <div key={booking.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-black ${booking.source === 'SIS' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  <span className="text-[10px] leading-none mb-0.5">{booking.startTime.split(':')[0]}</span>
                  <span className="text-sm leading-none">{booking.startTime.split(':')[1]}</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{booking.purpose}</h4>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <MapPin size={12} /> {booking.roomName} • {booking.courseCode || 'Special Event'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${booking.source === 'SIS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {booking.source}
                </div>
                {booking.recurrence !== 'None' && <Repeat size={14} className="text-slate-300" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#003366] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-2">Need a hall urgently?</h3>
          <p className="text-blue-100 text-sm mb-4">Find rooms by capacity, building, or specific amenities like AC or Projectors.</p>
          <button 
            onClick={() => setIsAssistantOpen(true)}
            className="bg-[#FFCC00] text-blue-950 px-4 py-2 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors"
          >
            Smart Venue Search
          </button>
        </div>
        <Sparkles className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-800 opacity-50 group-hover:rotate-12 transition-transform" />
      </div>
    </div>
  );

  const renderVenues = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search NEC, Science, Education..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`p-2.5 rounded-xl border transition-all ${Object.values(filters).some(v => v !== false && v !== 0) ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setFilters(f => ({ ...f, onlyAvailable: !f.onlyAvailable }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filters.onlyAvailable ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            <CheckCircle2 size={14} /> Available Now
          </button>
          <button 
            onClick={() => setFilters(f => ({ ...f, hasPlugPoints: !f.hasPlugPoints }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filters.hasPlugPoints ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            <Zap size={14} /> Power Plugs
          </button>
          <button 
            onClick={() => setFilters(f => ({ ...f, sortByProximity: !f.sortByProximity }))}
            disabled={!userCoords}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filters.sortByProximity ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-slate-500 border-slate-200 disabled:opacity-50'}`}
          >
            <Navigation size={14} /> Nearest to Me
          </button>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <Search size={32} />
          </div>
          <div>
            <p className="font-bold text-slate-900">No venues match your criteria</p>
            <p className="text-sm text-slate-500">Try adjusting your filters or search term.</p>
          </div>
          <button 
            onClick={() => setFilters({ onlyAvailable: false, hasPlugPoints: false, minCapacity: 0, sortByProximity: false })}
            className="text-[#003366] text-sm font-bold uppercase tracking-wider"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {filteredRooms.map(room => (
            <div key={room.id} className="relative">
              <VenueCard 
                venue={room} 
                onClick={setSelectedVenue} 
                onAvailabilityCheck={openAvailabilityCheck}
              />
              {filters.sortByProximity && userCoords && (
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 z-10">
                  <Navigation size={8} />
                  {Math.round(calculateDistance(userCoords.lat, userCoords.lng, room.coordinates.lat, room.coordinates.lng))}m away
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMap = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-220px)] overflow-hidden animate-in fade-in duration-500">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20">
        <h3 className="font-bold flex items-center gap-2 text-[#003366]">
          <MapIcon size={18} />
          Digital UCC Map
        </h3>
        <button 
           onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              });
            }
           }}
           className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase flex items-center gap-1"
        >
          <Navigation size={10} /> My Location
        </button>
      </div>
      <div className="flex-1 relative">
        <CampusMap venues={ROOMS} onVenueSelect={setSelectedVenue} />
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#003366]">Academic Schedule</h2>
        <div className="flex gap-2">
           <button 
            onClick={() => {
              if (confirm('Are you sure you want to clear your local data?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500"
          >
            Reset
          </button>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'SYNCING...' : 'SYNC SIS'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-2">
        <div className="flex gap-1 overflow-x-auto p-1 no-scrollbar">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <button key={day} className={`flex-1 min-w-[60px] py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${i === 0 ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
              <span className="text-[10px] font-bold uppercase">{day}</span>
              <span className="text-sm font-black">{12 + i}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {bookings.map(booking => (
          <div key={booking.id} className={`relative pl-4 border-l-4 ${booking.source === 'SIS' ? 'border-blue-500' : 'border-yellow-500'} bg-white p-4 rounded-r-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${booking.source === 'SIS' ? 'text-blue-600' : 'text-yellow-600'}`}>{booking.type}</span>
                  {booking.recurrence !== 'None' && <Repeat size={12} className="text-slate-400" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{booking.purpose}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-900">{booking.startTime}</p>
                <p className="text-[10px] font-bold text-slate-400">TO {booking.endTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
              <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase truncate max-w-[120px]">
                <MapPin size={12} /> {booking.roomName}
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase truncate max-w-[120px]">
                <UserIcon size={12} /> {booking.userName}
              </div>
              <div className="ml-auto">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 ${booking.source === 'SIS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <Database size={10} /> {booking.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-center py-6">
        <div className="relative">
          <img src="https://picsum.photos/seed/profile/100" className="w-24 h-24 rounded-full border-4 border-white shadow-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900">{user.name}</h2>
        <p className="text-slate-500 font-medium text-sm">{user.email}</p>
        <span className="mt-2 bg-blue-50 text-[#003366] px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
          {user.role} • {user.department}
        </span>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">System Integrations</h3>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
              <Database size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">UCC SIS Integration</h4>
              <p className="text-slate-500 text-xs">Academic schedule & User profile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-green-600 uppercase">CONNECTED</span>
            <CheckCircle size={18} className="text-green-500" />
          </div>
        </div>
      </div>
      
      <div className="pt-6">
        <button 
          onClick={() => {
            if(confirm('This will only clear session storage. Real accounts are persistent.')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg"
        >
          RESET ALL DATA
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto md:max-w-4xl min-h-screen pb-24 md:pb-8 flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden relative">
      
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 bg-[#003366] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/10 cursor-pointer">
            VH
          </div>
          <div className="cursor-pointer">
            <h1 className="text-lg font-black tracking-tight text-[#003366]">VENUEHUB</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">UCC Campus</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </div>
          <div 
            className="w-10 h-10 rounded-full border-2 border-slate-200 p-0.5 overflow-hidden cursor-pointer hover:border-[#003366] transition-colors"
            onClick={() => setView('profile')}
          >
            <img src="https://picsum.photos/seed/profile/100" alt="profile" className="w-full h-full rounded-full object-cover" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {view === 'dashboard' && renderDashboard()}
        {view === 'venues' && renderVenues()}
        {view === 'bookings' && renderBookings()}
        {view === 'profile' && renderProfile()}
        {view === 'map' && renderMap()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto bg-white/95 backdrop-blur-md border-t md:border-t-0 md:bg-transparent border-slate-200 px-4 py-3 z-40 md:mt-4">
        <div className="max-w-md mx-auto flex items-center justify-around md:justify-center md:gap-8">
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 group transition-colors ${view === 'dashboard' ? 'text-[#003366]' : 'text-slate-400'}`}>
            <LayoutDashboard size={22} className={view === 'dashboard' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
          </button>
          <button onClick={() => setView('venues')} className={`flex flex-col items-center gap-1 group transition-colors ${view === 'venues' ? 'text-[#003366]' : 'text-slate-400'}`}>
            <Building2 size={22} className={view === 'venues' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Rooms</span>
          </button>
          <button onClick={() => setView('map')} className={`flex flex-col items-center gap-1 group transition-colors ${view === 'map' ? 'text-[#003366]' : 'text-slate-400'}`}>
            <MapIcon size={22} className={view === 'map' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
          </button>
          <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-1 group transition-colors ${view === 'bookings' ? 'text-[#003366]' : 'text-slate-400'}`}>
            <Calendar size={22} className={view === 'bookings' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Schedule</span>
          </button>
          <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1 group transition-colors ${view === 'profile' ? 'text-[#003366]' : 'text-slate-400'}`}>
            <UserIcon size={22} className={view === 'profile' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Account</span>
          </button>
        </div>
      </nav>

      {isFilterDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-end justify-center" onClick={() => setIsFilterDrawerOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Refine Venues</h2>
              <button onClick={() => setIsFilterDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seating Capacity</h4>
                 <div className="flex flex-col gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="3000" 
                      step="50"
                      value={filters.minCapacity}
                      onChange={(e) => setFilters(f => ({ ...f, minCapacity: parseInt(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#003366]"
                    />
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                       <span>Any Size</span>
                       <span className="bg-blue-50 text-[#003366] px-3 py-1 rounded-full border border-blue-100">At least {filters.minCapacity} seats</span>
                       <span>3000+</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Features</h4>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setFilters(f => ({ ...f, onlyAvailable: !f.onlyAvailable }))}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${filters.onlyAvailable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                    >
                      <CheckCircle2 size={24} />
                      <span className="text-[10px] font-black uppercase">Available Only</span>
                    </button>
                    <button 
                      onClick={() => setFilters(f => ({ ...f, hasPlugPoints: !f.hasPlugPoints }))}
                      className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${filters.hasPlugPoints ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                    >
                      <Zap size={24} />
                      <span className="text-[10px] font-black uppercase">Power Outlets</span>
                    </button>
                 </div>
              </div>

              <div className="space-y-4 pb-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sorting Preferences</h4>
                 <button 
                    onClick={() => setFilters(f => ({ ...f, sortByProximity: !f.sortByProximity }))}
                    disabled={!userCoords}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${filters.sortByProximity ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500 disabled:opacity-50'}`}
                 >
                    <div className="flex items-center gap-3">
                       <Navigation size={20} />
                       <span className="text-[10px] font-black uppercase">Distance to Hall</span>
                    </div>
                    {!userCoords && <span className="text-[8px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">GPS OFF</span>}
                 </button>
              </div>

              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-full bg-[#003366] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-transform"
              >
                Show {filteredRooms.length} Venues
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVenue && !isBookingFormOpen && !isAvailabilityViewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setSelectedVenue(null)}>
          <div className="bg-white w-full max-w-xl rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="relative h-64">
              <img src={selectedVenue.image} className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedVenue(null)}
                className="absolute top-4 right-4 bg-black/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-black/40"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedVenue.name}</h2>
                  <p className="text-slate-500 font-medium flex items-center gap-1 mt-1">
                    <MapPin size={16} /> {BUILDINGS.find(b => b.id === selectedVenue.buildingId)?.name}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedVenue.status === VenueStatus.AVAILABLE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {selectedVenue.status}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <Users size={16} />
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Seats</div>
                  <div className="font-black text-sm">{selectedVenue.capacity}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                    <Calendar size={16} />
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Today</div>
                  <div className="font-black text-sm">{bookings.filter(b => b.roomId === selectedVenue.id && b.date === today).length}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                    <Building size={16} />
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Floor</div>
                  <div className="font-black text-sm">{selectedVenue.floor}</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Facility Amenities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedVenue.amenityIds.map((aid) => {
                    const amenity = AMENITIES.find(a => a.id === aid);
                    return (
                      <span key={aid} className="bg-slate-100 text-slate-700 text-[11px] px-3 py-2 rounded-lg font-semibold flex items-center gap-2">
                        {getAmenityIcon(aid)}
                        {amenity?.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAvailabilityViewOpen(true)}
                  className="flex-1 bg-slate-100 text-slate-800 py-4 rounded-2xl font-black text-sm border border-slate-200 transition-colors active:scale-95"
                >
                  Schedule
                </button>
                <button 
                  onClick={() => {
                    setConflictError(null);
                    setIsBookingFormOpen(true);
                  }}
                  className="flex-[2] bg-[#003366] text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-900/20 hover:bg-blue-900 transition-colors active:scale-95"
                >
                  Instant Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAvailabilityViewOpen && selectedVenue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setIsAvailabilityViewOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <CalendarSearch size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Availability Check</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedVenue.name}</p>
                </div>
              </div>
              <button onClick={() => setIsAvailabilityViewOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 shrink-0">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Inspection Date</label>
              <input 
                type="date" 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none shadow-sm"
                value={checkDate}
                onChange={e => setCheckDate(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Schedule for {new Date(checkDate).toDateString()}</h4>
              
              {venueBookingsOnDate.length > 0 ? (
                venueBookingsOnDate.map(booking => (
                  <div key={booking.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                    <div className="shrink-0 text-center min-w-[60px]">
                      <div className="text-sm font-black text-[#003366]">{booking.startTime}</div>
                      <div className="text-[10px] font-bold text-slate-400">TO {booking.endTime}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <h5 className="font-bold text-slate-900 text-sm truncate">{booking.purpose}</h5>
                        {booking.recurrence !== 'None' && <Repeat size={10} className="text-slate-400" />}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <UserIcon size={12} /> {booking.userName}
                      </p>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${booking.source === 'SIS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {booking.source}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Calendar size={32} className="mx-auto opacity-20 mb-2" />
                  <p className="text-sm font-medium">No bookings found for this date.</p>
                  <p className="text-[10px] uppercase font-black tracking-widest mt-1 text-green-500">Hall is Fully Available</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button 
                onClick={() => {
                  setConflictError(null);
                  setBookingFormData({ ...bookingFormData, date: checkDate });
                  setIsAvailabilityViewOpen(false);
                  setIsBookingFormOpen(true);
                }}
                className="w-full bg-[#003366] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-900 transition-colors active:scale-95"
              >
                Book This Hall
              </button>
            </div>
          </div>
        </div>
      )}

      {isBookingFormOpen && selectedVenue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[220] flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setIsBookingFormOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">New Booking</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedVenue.name} ({user.role})</p>
              </div>
              <button onClick={() => setIsBookingFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateBooking} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {conflictError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-red-800 font-medium">{conflictError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Booking Purpose</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g., Computer Science Seminar" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none transition-all"
                    value={bookingFormData.purpose}
                    onChange={e => setBookingFormData({...bookingFormData, purpose: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Date</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                        value={bookingFormData.date}
                        onChange={e => setBookingFormData({...bookingFormData, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Type</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                      value={bookingFormData.type}
                      onChange={e => setBookingFormData({...bookingFormData, type: e.target.value as Booking['type']})}
                    >
                      <option value="Event">Event</option>
                      <option value="Lecture">Lecture</option>
                      <option value="Student Org">Student Org</option>
                      <option value="Examination">Examination</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Start Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="time" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                        value={bookingFormData.startTime}
                        onChange={e => setBookingFormData({...bookingFormData, startTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">End Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="time" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                        value={bookingFormData.endTime}
                        onChange={e => setBookingFormData({...bookingFormData, endTime: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Repeating Schedule</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                          value={bookingFormData.recurrence}
                          onChange={e => setBookingFormData({...bookingFormData, recurrence: e.target.value as RecurrenceType})}
                        >
                          <option value="None">One-time</option>
                          <option value="Daily">Every Day</option>
                          <option value="Weekly">Every Week</option>
                        </select>
                      </div>
                      {bookingFormData.recurrence !== 'None' && (
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Repeat Until</label>
                          <input 
                            required
                            type="date" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                            value={bookingFormData.recurrenceEndDate}
                            onChange={e => setBookingFormData({...bookingFormData, recurrenceEndDate: e.target.value})}
                          />
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
                <CheckCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Role: <b>{user.role}</b>. Overlap checking active. SIS system conflicts will be prioritized during final synchronization.
                </p>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#003366] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-900 transition-colors active:scale-95"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {isAssistantOpen && (
        <div className="fixed inset-0 z-[130] flex flex-col md:items-end md:justify-end md:p-8">
           <div className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setIsAssistantOpen(false)}></div>
           <div className="relative w-full md:w-[400px] h-[80vh] md:h-[600px] mt-auto animate-in slide-in-from-bottom duration-300">
              <Assistant onClose={() => setIsAssistantOpen(false)} />
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
