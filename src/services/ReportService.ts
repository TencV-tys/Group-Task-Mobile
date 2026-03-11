// src/services/ReportService.ts
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

const API_URL = `${API_BASE_URL}/api/reports`; 

export class ReportService {
  private static async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('userToken');
  }

  static async submitGroupReport(groupId: string, data: { type: string; description: string }) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${API_URL}/group`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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