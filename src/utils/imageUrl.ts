// utils/imageUrl.ts
import { API_BASE_URL } from '../config/api';

export const getFullImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};