// src/utils/timeUtils.ts - COMPLETE WITH PROPER UTC DATE FORMATTERS

// Convert 12h time to 24h format for storage
export const convertTo24Hour = (hour12: string, minute: string, period: string): string => {
  let hour = parseInt(hour12, 10);
  
  if (period === 'PM' && hour < 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minute}`;
};

// Convert 24h time to 12h format for display
export const convertTo12Hour = (time24: string): { hour: string; minute: string; period: string } => {
  if (!time24 || !time24.includes(':')) {
    return { hour: '8', minute: '00', period: 'AM' };
  }
  
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return {
    hour: hour12.toString(),
    minute: minutes.toString().padStart(2, '0'),
    period
  };
};

// Validate if end time is after start time
export const validateTimeSlot = (start24: string, end24: string): boolean => {
  const [startHour, startMinute] = start24.split(':').map(Number);
  const [endHour, endMinute] = end24.split(':').map(Number);
  
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  
  return endTotal > startTotal;
};

// Format time for display (e.g., "8:30 AM")
export const formatTimeDisplay = (time24: string): string => {
  const { hour, minute, period } = convertTo12Hour(time24);
  return `${hour}:${minute} ${period}`;
};

// Generate time options for pickers
export const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
export const MINUTE_OPTIONS = ['00', '15', '30', '45'];
export const PERIOD_OPTIONS = ['AM', 'PM'];

// Day of week options
export const DAY_OF_WEEK_OPTIONS = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' }
];

// ========== UTC DATE FORMATTERS - FIXED (No timezone conversion) ==========

/**
 * Format a UTC date string to UTC date without timezone conversion
 * Example: "2026-04-08T19:00:00.000Z" → "Apr 8, 2026"
 */
export const formatUTCDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  // Extract UTC components directly - NO timezone conversion!
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${monthNames[month]} ${day}, ${year}`;
};

/**
 * Format a UTC date string to UTC date with time without timezone conversion
 * Example: "2026-04-08T19:00:00.000Z" → "Apr 8, 2026, 7:00 PM"
 */
export const formatUTCDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return `${monthNames[month]} ${day}, ${year}, ${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Format a UTC date string to display day and date
 * Example: "2026-04-08T19:00:00.000Z" → "Wednesday, Apr 8"
 */
export const formatUTCDayAndDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[date.getUTCDay()];
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getUTCMonth()];
  const day = date.getUTCDate();
  
  return `${dayName}, ${month} ${day}`;
};

/**
 * Get the UTC day name from a date string
 * Example: "2026-04-08T19:00:00.000Z" → "Wednesday"
 */
export const getUTCDayName = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[date.getUTCDay()];
};

/**
 * Format a UTC date string to full date with day name
 * Example: "2026-04-08T19:00:00.000Z" → "Wednesday, April 8, 2026"
 */
export const formatUTCFullDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[date.getUTCDay()];
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  
  return `${dayName}, ${month} ${day}, ${year}`;
};

/**
 * Check if a UTC date is today (using UTC comparison)
 */
export const isUTCToday = (dateString: string): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() &&
         date.getUTCMonth() === now.getUTCMonth() &&
         date.getUTCDate() === now.getUTCDate();
};

/**
 * Get relative time from UTC date (e.g., "2 days ago", "in 3 days")
 */
export const getUTCRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  // Use UTC dates for comparison
  const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  
  const diffMs = dateUTC - nowUTC;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};

/**
 * Format UTC date to ISO date string (YYYY-MM-DD)
 */
export const formatISODate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Compare two UTC dates (returns true if same day)
 */
export const isSameUTCDay = (date1: string, date2: string): boolean => {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
         d1.getUTCMonth() === d2.getUTCMonth() &&
         d1.getUTCDate() === d2.getUTCDate();
};

/**
 * Get UTC date as YYYY-MM-DD string
 */
export const getUTCDateKey = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};  