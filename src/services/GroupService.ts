// src/services/GroupService.ts (React Native - FRONTEND) - UPDATED WITH SECURESTORE
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';

const API_URL = `${API_BASE_URL}/api/group`;

export class GroupService {
  
  // ========== GET AUTH TOKEN FROM SECURESTORE ==========
  private static async getAuthToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      console.log('🔐 Auth token retrieved:', token ? 'Yes' : 'No');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // ========== GET HEADERS WITH TOKEN ==========
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Added Authorization header');
    } else {
      console.warn('⚠️ No auth token available - request may fail');
    }
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // ========== CREATE GROUP ==========
  static async createGroup(name: string, description?: string) {
    try {
      if (!name.trim()) {
        return {
          success: false,
          message: "Group name is required"
        };
      }

      console.log(`GroupService: Creating group "${name}"`);
      
      const headers = await this.getHeaders();
      
      // Only include description if it exists
      const body: any = {
        name: name.trim()
      };
      
      if (description && description.trim()) {
        body.description = description.trim();
      }
      
      const response = await fetch(`${API_URL}/create`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      console.log(`GroupService: Response status: ${response.status}`);
      
      const result = await response.json();
      console.log(`GroupService: Result:`, result);
      
      return result;

    } catch (e: any) {
      console.error("GroupService.createGroup error:", e);
      return {
        success: false,
        message: e.message || "Failed to create group"
      };
    }
  }

  // ========== GET USER'S GROUPS ==========
  static async getUserGroups() {
    try {
      console.log("GroupService: Getting user groups...");
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/my-groups`, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      console.log("GroupService: Groups result:", result);
      
      return result;

    } catch (error: any) {
      console.error("GroupService.getUserGroups error:", error);
      return {
        success: false,
        message: "Failed to load groups. Please check your connection.",
        error: error.message
      };
    }
  }

  // ========== JOIN GROUP ==========
  static async joinGroup(inviteCode: string) {
    try {
      if (!inviteCode || !inviteCode.trim()) {
        return {
          success: false,
          message: "Invite code is required"
        };
      }

      const cleanInviteCode = inviteCode.trim().toUpperCase();
      console.log(`GroupService: Joining group with code ${cleanInviteCode}`);

      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/join`, {
        method: "POST",
        headers,
        body: JSON.stringify({ inviteCode: cleanInviteCode }),
      });

      const result = await response.json();
      console.log(`GroupService: Join result:`, result);
      
      return result;

    } catch (e: any) {
      console.error("GroupService.joinGroup error:", e);
      return {
        success: false,
        message: e.message || "Error joining group"
      };
    }
  }

  // ========== GET GROUP MEMBERS ==========
  static async getGroupMembers(groupId: string) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Getting members for group ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/members`, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("GroupService.getGroupMembers error:", error);
      return {
        success: false,
        message: error.message || "Failed to load group members"
      };
    }
  }

  // ========== UPDATE MEMBER ROTATION ==========
  static async updateMemberRotation(
    groupId: string,
    memberId: string,
    rotationOrder?: number,
    isActive?: boolean
  ) {
    try {
      if (!groupId || !memberId) {
        return {
          success: false,
          message: "Group ID and Member ID are required"
        };
      }

      console.log(`GroupService: Updating member ${memberId} rotation in group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/rotation`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          rotationOrder,
          isActive
        }),
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("GroupService.updateMemberRotation error:", error);
      return {
        success: false,
        message: error.message || "Failed to update member rotation"
      };
    }
  }

  // ========== REORDER ROTATION SEQUENCE ==========
  static async reorderRotationSequence(groupId: string, newOrder: Array<{ memberId: string, rotationOrder: number }>) {
    try {
      if (!groupId || !newOrder || !Array.isArray(newOrder)) {
        return {
          success: false,
          message: "Group ID and new order array are required"
        };
      }

      console.log(`GroupService: Reordering rotation for group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/reorder-rotation`, {
        method: "POST",
        headers,
        body: JSON.stringify({ newOrder }),
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("GroupService.reorderRotationSequence error:", error);
      return {
        success: false,
        message: error.message || "Failed to reorder rotation sequence"
      };
    }
  }

  // ========== GET ROTATION SCHEDULE PREVIEW ==========
  static async getRotationSchedulePreview(groupId: string, weeks: number = 4) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Getting rotation schedule for group ${groupId} (${weeks} weeks)`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/rotation-schedule?weeks=${weeks}`, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("GroupService.getRotationSchedulePreview error:", error);
      return {
        success: false,
        message: error.message || "Failed to load rotation schedule"
      };
    }
  }

  // ========== GET GROUP DETAILS ==========
  static async getGroupDetails(groupId: string) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Getting details for group ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/details`, {
        method: "GET",
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("GroupService.getGroupDetails error:", error);
      return {
        success: false,
        message: error.message || "Failed to load group details"
      };
    }
  }

  // ========== LEAVE GROUP ==========
  static async leaveGroup(groupId: string) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Leaving group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/leave`, {
        method: "POST",
        headers,
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error("GroupService.leaveGroup error:", error);
      return {
        success: false,
        message: error.message || "Failed to leave group"
      };
    }
  }
}