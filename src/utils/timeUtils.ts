// src/utils/timeUtils.ts

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