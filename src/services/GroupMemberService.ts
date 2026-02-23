// services/GroupMembersService.ts - UPDATED WITH TOKEN AUTH
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = `${API_BASE_URL}/api/group`;

export class GroupMembersService {
  
  // ========== GET AUTH TOKEN ==========
  private static async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('userToken');
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

  // ========== GET GROUP MEMBERS ==========
  static async getGroupMembers(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting members for group ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/members`, {
        method: 'GET',
        headers,
        // credentials: 'include' // Not needed with token
      });

      const result = await response.json();
      console.log(`GroupMembersService: Members result:`, result);
      
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getGroupMembers error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load members'
      };
    }
  }

  // ========== GET GROUP MEMBERS WITH ROTATION ==========
  static async getGroupMembersWithRotation(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting members with rotation for group ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/members-rotation`, {
        method: 'GET',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getGroupMembersWithRotation error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load members with rotation details'
      };
    }
  }

  // ========== GET GROUP INFO ==========
  static async getGroupInfo(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting info for group ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/info`, {
        method: 'GET',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getGroupInfo error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group info'
      };
    }
  }

  // ========== GET GROUP SETTINGS ==========
  static async getGroupSettings(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting settings for group ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/settings`, {
        method: 'GET',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getGroupSettings error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group settings'
      };
    }
  }

  // ========== REMOVE MEMBER ==========
  static async removeMember(groupId: string, memberId: string) {
    try {
      console.log(`GroupMembersService: Removing member ${memberId} from group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.removeMember error:', error);
      return {
        success: false,
        message: error.message || 'Failed to remove member'
      };
    }
  }

  // ========== UPDATE MEMBER ROLE ==========
  static async updateMemberRole(groupId: string, memberId: string, newRole: string) {
    try {
      if (!['ADMIN', 'MEMBER'].includes(newRole)) {
        return {
          success: false,
          message: "Invalid role. Must be ADMIN or MEMBER"
        };
      }

      console.log(`GroupMembersService: Updating member ${memberId} role to ${newRole} in group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/role`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ newRole }),
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.updateMemberRole error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update member role'
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
      console.log(`GroupMembersService: Updating rotation for member ${memberId} in group ${groupId}`, {
        rotationOrder,
        isActive
      });
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/rotation`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rotationOrder, isActive }),
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.updateMemberRotation error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update member rotation'
      };
    }
  }

  // ========== REORDER ROTATION SEQUENCE ==========
  static async reorderRotationSequence(groupId: string, newOrder: Array<{ memberId: string, rotationOrder: number }>) {
    try {
      if (!newOrder || !Array.isArray(newOrder)) {
        return {
          success: false,
          message: "New order array is required"
        };
      }

      console.log(`GroupMembersService: Reordering rotation for group ${groupId}`, newOrder);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/reorder-rotation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newOrder }),
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.reorderRotationSequence error:', error);
      return {
        success: false,
        message: error.message || 'Failed to reorder rotation sequence'
      };
    }
  }

  // ========== LEAVE GROUP ==========
  static async leaveGroup(groupId: string) {
    try {
      console.log(`GroupMembersService: Leaving group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/leave`, {
        method: 'DELETE',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.leaveGroup error:', error);
      return {
        success: false,
        message: error.message || 'Failed to leave group'
      };
    }
  }

  // ========== GET ROTATION SCHEDULE PREVIEW ==========
  static async getRotationSchedulePreview(groupId: string, weeks: number = 4) {
    try {
      console.log(`GroupMembersService: Getting rotation schedule for group ${groupId} (${weeks} weeks)`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/rotation-preview?weeks=${weeks}`, {
        method: 'GET',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getRotationSchedulePreview error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load rotation schedule'
      };
    }
  }

  // ========== GET GROUP DETAILS ==========
  static async getGroupDetails(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting group details for ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}`, {
        method: 'GET',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getGroupDetails error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group details'
      };
    }
  }

  // ========== GET CURRENT WEEK ASSIGNMENTS ==========
  static async getCurrentWeekAssignments(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting current week assignments for group ${groupId}`);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${groupId}/current-assignments`, {
        method: 'GET',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getCurrentWeekAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load current assignments'
      };
    }
  }

  // ========== UPDATE GROUP ==========
  static async updateGroup(groupId: string, groupData: { name?: string, description?: string }) {
    try {
      console.log(`GroupMembersService: Updating group ${groupId} with data:`, groupData);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/update`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(groupData),
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.updateGroup error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update group'
      };
    }
  }

  // ========== TRANSFER OWNERSHIP ==========
  static async transferOwnership(groupId: string, newAdminId: string) {
    try {
      console.log(`GroupMembersService: Transferring ownership of group ${groupId} to user ${newAdminId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/transfer-ownership`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newAdminId }),
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.transferOwnership error:', error);
      return {
        success: false,
        message: error.message || 'Failed to transfer ownership'
      };
    }
  }

  // ========== REGENERATE INVITE CODE ==========
  static async regenerateInviteCode(groupId: string) {
    try {
      console.log(`GroupMembersService: Regenerating invite code for group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/regenerate-invite`, {
        method: 'POST',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.regenerateInviteCode error:', error);
      return {
        success: false,
        message: error.message || 'Failed to regenerate invite code'
      };
    }
  }

  // ========== DELETE GROUP ==========
  static async deleteGroup(groupId: string) {
    try {
      console.log(`GroupMembersService: Deleting group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/delete`, {
        method: 'DELETE',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.deleteGroup error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete group'
      };
    }
  }

  // ========== DELETE GROUP AVATAR ==========
  static async deleteGroupAvatar(groupId: string) {
    try {
      console.log(`GroupMembersService: Deleting avatar for group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${groupId}/avatar`, {
        method: 'DELETE',
        headers,
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.deleteGroupAvatar error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete group avatar'
      };
    }
  }

  // ========== UPLOAD GROUP AVATAR ==========
  static async uploadGroupAvatar(groupId: string, base64Image: string) {
    try {
      console.log(`GroupMembersService: Uploading avatar for group ${groupId}`);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/uploads/group/${groupId}/avatar/base64`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ avatarBase64: base64Image }),
        // credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.uploadGroupAvatar error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload group avatar'
      };
    }
  }
}