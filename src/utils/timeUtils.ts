// src/utils/timeUtils.ts - COMPLETE WITH UTC DATE FORMATTERS

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

// ========== UTC DATE FORMATTERS ==========

/**
 * Format a UTC date string to local date string in UTC timezone
 * Example: "2026-04-01T21:00:00.000Z" → "Apr 1, 2026"
 */
export const formatUTCDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format a UTC date string to local date string with time in UTC timezone
 * Example: "2026-04-01T21:00:00.000Z" → "Apr 1, 2026, 9:00 PM"
 */
export const formatUTCDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format a UTC date string to display day and date
 * Example: "2026-04-01T21:00:00.000Z" → "Wednesday, Apr 1"
 */
export const formatUTCDayAndDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[date.getUTCDay()];
  const formattedDate = date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric'
  });
  return `${dayName}, ${formattedDate}`;
};

/**
 * Get the UTC day name from a date string
 * Example: "2026-04-01T21:00:00.000Z" → "Wednesday"
 */
export const getUTCDayName = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[date.getUTCDay()];
};

/**
 * Format a UTC date string to full date with day name
 * Example: "2026-04-01T21:00:00.000Z" → "Wednesday, April 1, 2026"
 */
export const formatUTCFullDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[date.getUTCDay()];
  const formattedDate = date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return `${dayName}, ${formattedDate}`;
};

/**
 * Check if a UTC date is today
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
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
};