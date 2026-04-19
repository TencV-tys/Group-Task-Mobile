// src/services/ReportService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/reports`; 

export class ReportService {
 
  // In ReportService.ts

static async submitGroupReport(groupId: string, data: { type: string; description: string }) {
  try {
    const headers = await TokenUtils.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/group`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        groupId,
        type: data.type,
        description: data.description,
      }),
    });
    
    const result = await response.json();
    
    // ✅ If response is not successful, throw error
    if (!result.success) {
      throw new Error(result.message || 'Failed to submit report');
    }
    
    return result;
  } catch (error) {
    console.error('Error submitting report:', error);
    throw error;
  }
} 
}