
export enum VenueStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  BOOKED = 'Booked',
  MAINTENANCE = 'Maintenance'
}

export type Role = 'Student' | 'Lecturer' | 'Teaching Assistant' | 'Admin';
export type RecurrenceType = 'None' | 'Daily' | 'Weekly';

export interface University {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
}

export interface Campus {
  id: string;
  universityId: string;
  name: string;
  coordinates: { lat: number; lng: number };
}

export interface Building {
  id: string;
  campusId: string;
  name: string;
  code: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  floor: number;
  capacity: number;
  status: VenueStatus;
  amenityIds: string[];
  image: string;
  coordinates: { lat: number; lng: number };
  description: string;
  type: 'Lecture Hall' | 'Lab' | 'Seminar Room';
}

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  userRole: Role;
  date: string; // Start date
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose: string;
  type: 'Lecture' | 'Event' | 'Student Org' | 'Examination';
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled';
  source: 'SIS' | 'Manual' | 'Google Calendar';
  courseCode?: string;
  // Recurrence fields
  recurrence: RecurrenceType;
  recurrenceEndDate?: string;
}

export interface User {
  id: string;
  universityId: string;
  name: string;
  role: Role;
  email: string;
  sisLinked: boolean;
  calendarLinked: boolean;
  department?: string;
  lastSynced?: string;
}
