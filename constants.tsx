
import { University, Campus, Building, Room, Amenity, VenueStatus, Booking } from './types';

export const today = new Date().toISOString().split('T')[0];

export const AMENITIES: Amenity[] = [
  { id: 'a1', name: 'Projector', icon: 'projector' },
  { id: 'a2', name: 'AC', icon: 'wind' },
  { id: 'a3', name: 'Fans', icon: 'fan' },
  { id: 'a4', name: 'PA System', icon: 'mic' },
  { id: 'a5', name: 'Smart Board', icon: 'monitor' },
  { id: 'a6', name: 'Disability Access', icon: 'accessibility' },
  { id: 'a7', name: 'Power Outlets', icon: 'zap' }
];

export const UNIVERSITIES: University[] = [
  { id: 'u1', name: 'University of Cape Coast', slug: 'ucc', logoUrl: '' }
];

export const CAMPUSES: Campus[] = [
  { id: 'c1', universityId: 'u1', name: 'Main Campus', coordinates: { lat: 5.1054, lng: -1.2821 } },
  { id: 'c2', universityId: 'u1', name: 'Science Campus', coordinates: { lat: 5.1062, lng: -1.2835 } },
  { id: 'c3', universityId: 'u1', name: 'North Campus', coordinates: { lat: 5.1120, lng: -1.2750 } }
];

export const BUILDINGS: Building[] = [
  { id: 'bld1', campusId: 'c1', name: 'New Examination Centre', code: 'NEC' },
  { id: 'bld2', campusId: 'c2', name: 'Science Block', code: 'SCI' },
  { id: 'bld3', campusId: 'c1', name: 'Main Administration', code: 'ADM' },
  { id: 'bld4', campusId: 'c3', name: 'Language Centre', code: 'ALC' }
];

export const ROOMS: Room[] = [
  {
    id: 'r1',
    buildingId: 'bld1',
    name: 'Hall 1',
    floor: 0,
    capacity: 1200,
    status: VenueStatus.OCCUPIED,
    amenityIds: ['a1', 'a2', 'a4', 'a6', 'a7'],
    image: 'https://picsum.photos/seed/nec1/800/400',
    coordinates: { lat: 5.1054, lng: -1.2821 },
    description: 'Premier examination facility.',
    type: 'Lecture Hall'
  },
  {
    id: 'r2',
    buildingId: 'bld2',
    name: 'LLT',
    floor: 1,
    capacity: 800,
    status: VenueStatus.AVAILABLE,
    amenityIds: ['a1', 'a3', 'a4'],
    image: 'https://picsum.photos/seed/llt/800/400',
    coordinates: { lat: 5.1062, lng: -1.2835 },
    description: 'Large Lecture Theatre for core sciences.',
    type: 'Lecture Hall'
  },
  {
    id: 'r3',
    buildingId: 'bld3',
    name: 'Main Auditorium',
    floor: 0,
    capacity: 2500,
    status: VenueStatus.BOOKED,
    amenityIds: ['a1', 'a2', 'a4', 'a6'],
    image: 'https://picsum.photos/seed/aud1/800/400',
    coordinates: { lat: 5.1041, lng: -1.2805 },
    description: 'The largest auditorium in UCC.',
    type: 'Lecture Hall'
  }
];

export const MOCK_SCHEDULE: Booking[] = [
  {
    id: 'book1',
    roomId: 'r1',
    roomName: 'NEC Hall 1',
    userId: 'u100',
    userName: 'Dr. John Doe',
    userRole: 'Lecturer',
    date: today,
    startTime: '08:30',
    endTime: '10:30',
    purpose: 'Advanced Web Development',
    courseCode: 'CSC 401',
    type: 'Lecture',
    status: 'Confirmed',
    source: 'SIS',
    recurrence: 'Weekly',
    recurrenceEndDate: '2025-12-31'
  }
];

export const UCC_BRAND = {
  primary: '#003366',
  secondary: '#FFCC00',
  accent: '#E31837',
  text: '#1e293b'
};
