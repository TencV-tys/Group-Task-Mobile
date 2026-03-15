// src/services/ReportService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/reports`; 

export class ReportService {
  // ========== NO NEED FOR getAuthToken - use TokenUtils directly ==========

  static async submitGroupReport(groupId: string, data: { type: string; description: string }) {
    try {
      // ✅ Use TokenUtils.getAuthHeaders() for consistent auth
      const headers = await TokenUtils.getAuthHeaders(); // includes Authorization and Content-Type
      
      const response = await fetch(`${API_URL}/group`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          groupId,
          type: data.type,
          description: data.description,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  }
}