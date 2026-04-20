// utils/imageUrl.ts
import { API_BASE_URL } from '../config/api';

export const getFullImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  console.log('🔍 [getFullImageUrl] Input URL:', url);
  
  // If already a full URL (Cloudinary), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Check if it's a Cloudinary URL
    if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
      console.log('✅ Cloudinary URL detected, returning as-is');
      return url;
    }
    return url;
  }
  
  // Handle relative paths - clean up double slashes
  let cleanUrl = url;
  
  // Remove duplicate 'task-photos'
  if (cleanUrl.includes('/task-photos/task-photos/')) {
    cleanUrl = cleanUrl.replace('/task-photos/task-photos/', '/task-photos/');
    console.log('🔧 Fixed duplicate URL:', cleanUrl);
  }
  
  // Ensure URL starts with /
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = '/' + cleanUrl;
  }
  
  const fullUrl = `${API_BASE_URL}${cleanUrl}`;
  console.log('✅ [getFullImageUrl] Full URL:', fullUrl);
  return fullUrl;
};