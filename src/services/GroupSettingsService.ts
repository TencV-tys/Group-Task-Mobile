// services/GroupSettingsService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/group`;

export class GroupSettingsService {
  
  // ========== NO NEED FOR getAuthToken and getHeaders anymore - use TokenUtils directly ==========

  // Get group with member limits
  static async getGroupWithLimits(groupId: string) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/with-limits`, {
        method: 'GET',
        headers
      });
      
      return await response.json();
    } catch (error: any) {
      console.error('Error getting group with limits:', error);
      return { success: false, message: error.message };
    }
  } 

  // Update max members (admin only)
  static async updateMaxMembers(groupId: string, maxMembers: number) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() for POST/PUT requests
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/update-max-members`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ maxMembers })
      });
      
      return await response.json();
    } catch (error: any) {
      console.error('Error updating max members:', error);
      return { success: false, message: error.message };
    }
  }
}