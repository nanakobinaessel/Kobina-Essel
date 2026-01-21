
import { Booking } from '../types';

/**
 * Converts "HH:mm" time string to minutes from midnight for easy comparison.
 */
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Checks if two time ranges overlap on the same day.
 */
const timesOverlap = (s1: string, e1: string, s2: string, e2: string): boolean => {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  
  return start1 < end2 && end1 > start2;
};

/**
 * Determines if a specific date falls within a recurrence pattern.
 */
const isDateInRecurrence = (checkDateStr: string, booking: Booking): boolean => {
  const checkDate = new Date(checkDateStr);
  const startDate = new Date(booking.date);
  const endDate = booking.recurrenceEndDate ? new Date(booking.recurrenceEndDate) : null;

  // If before start date or after end date, no overlap
  if (checkDate < startDate) return false;
  if (endDate && checkDate > endDate) return false;

  if (booking.recurrence === 'None') {
    return checkDateStr === booking.date;
  }

  if (booking.recurrence === 'Daily') {
    return true; // Any date after start and before end is valid
  }

  if (booking.recurrence === 'Weekly') {
    // Check if it's the same day of the week
    return checkDate.getDay() === startDate.getDay();
  }

  return false;
};

/**
 * Core Logic: Checks if a new booking conflicts with existing ones.
 * Supports checking a single instance against a list that might contain recurrent rules.
 */
export const checkBookingOverlap = (
  newBooking: Partial<Booking>,
  existingBookings: Booking[]
): Booking | null => {
  if (!newBooking.roomId || !newBooking.date || !newBooking.startTime || !newBooking.endTime) {
    return null;
  }

  for (const existing of existingBookings) {
    // Only check same room
    if (existing.roomId !== newBooking.roomId) continue;
    
    // Only check confirmed/pending bookings
    if (existing.status === 'Cancelled' || existing.status === 'Rejected') continue;

    // Recurrence Overlap Check
    // We check if the 'newBooking' date exists in 'existing' recurrence
    // OR if 'existing' date exists in 'newBooking' recurrence (if newBooking is recurrent)
    
    // Simplification for this implementation: 
    // We check if the dates intersect. If newBooking is recurrent, we'd ideally 
    // check a range. For now, we check the specific date the user is looking at.
    
    const datesIntersect = isDateInRecurrence(newBooking.date, existing);
    
    if (datesIntersect) {
      if (timesOverlap(newBooking.startTime, newBooking.endTime, existing.startTime, existing.endTime)) {
        return existing;
      }
    }
  }

  return null;
};
