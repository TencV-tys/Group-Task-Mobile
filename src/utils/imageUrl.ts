// utils/imageUrl.ts
import { API_BASE_URL } from '../config/api';

export const getFullImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // ✅ FIX: Remove duplicate 'task-photos' folder
  let cleanUrl = url;
  if (cleanUrl.includes('/task-photos/task-photos/')) {
    cleanUrl = cleanUrl.replace('/task-photos/task-photos/', '/task-photos/');
    console.log('🔧 Fixed duplicate URL:', cleanUrl);
  }
  
  // If already a full URL, return cleaned version
  if (cleanUrl.startsWith('http')) return cleanUrl;
  
  // Handle relative paths
  return `${API_BASE_URL}${cleanUrl}`;
};