// src/groupMemberServices/GroupMemberService.ts (React Native - FRONTEND)
import {API_BASE_URL} from '../config/api';

const API_URL = `${API_BASE_URL}/api/group`;

export class GroupMembersService {
  // Get all members of a group with rotation info
  static async getGroupMembers(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting members for group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/members`, {
        method: 'GET',
        credentials: 'include'
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

  // Get group members with detailed rotation info
  static async getGroupMembersWithRotation(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting members with rotation for group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/members/rotation`, {
        method: 'GET',
        credentials: 'include'
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

  // Get group info including invite code and rotation stats
  static async getGroupInfo(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting info for group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/info`, {
        method: 'GET',
        credentials: 'include'
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

  // Remove a member from group (admin only)
  static async removeMember(groupId: string, memberId: string) {
    try {
      console.log(`GroupMembersService: Removing member ${memberId} from group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
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

  // Update member role (admin only)
  static async updateMemberRole(groupId: string, memberId: string, newRole: string) {
    try {
      if (!['ADMIN', 'MEMBER'].includes(newRole)) {
        return {
          success: false,
          message: "Invalid role. Must be ADMIN or MEMBER"
        };
      }

      console.log(`GroupMembersService: Updating member ${memberId} role to ${newRole} in group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ newRole }),
        credentials: 'include'
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

  // Update member rotation settings (admin only)
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
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/rotation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          rotationOrder,
          isActive
        }),
        credentials: 'include'
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

  // Reorder rotation sequence (admin only)
  static async reorderRotationSequence(groupId: string, newOrder: Array<{ memberId: string, rotationOrder: number }>) {
    try {
      if (!newOrder || !Array.isArray(newOrder)) {
        return {
          success: false,
          message: "New order array is required"
        };
      }

      console.log(`GroupMembersService: Reordering rotation for group ${groupId}`, newOrder);
      
      const response = await fetch(`${API_URL}/${groupId}/reorder-rotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ newOrder }),
        credentials: 'include'
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

  // Leave group
  static async leaveGroup(groupId: string) {
    try {
      console.log(`GroupMembersService: Leaving group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/leave`, {
        method: 'POST',
        credentials: 'include'
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

  // Get rotation schedule preview
  static async getRotationSchedulePreview(groupId: string, weeks: number = 4) {
    try {
      console.log(`GroupMembersService: Getting rotation schedule for group ${groupId} (${weeks} weeks)`);
      
      const response = await fetch(`${API_URL}/${groupId}/rotation-schedule?weeks=${weeks}`, {
        method: 'GET',
        credentials: 'include'
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

  // Get group details including rotation info
  static async getGroupDetails(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting group details for ${groupId}`);
      
      // Note: This endpoint might be the same as getGroupInfo
      const response = await fetch(`${API_URL}/${groupId}`, {
        method: 'GET',
        credentials: 'include'
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

  // Get current week rotation assignments
  static async getCurrentWeekAssignments(groupId: string) {
    try {
      console.log(`GroupMembersService: Getting current week assignments for group ${groupId}`);
      
      // This endpoint should be added to your backend
      const response = await fetch(`${API_URL}/${groupId}/current-assignments`, {
        method: 'GET',
        credentials: 'include'
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
  // Add this method to src/groupMemberServices/GroupMemberService.ts
static async updateGroup(groupId: string, groupData: { name?: string, description?: string }) {
  try {
    console.log(`GroupMembersService: Updating group ${groupId} with data:`, groupData);
    
    const response = await fetch(`${API_URL}/${groupId}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(groupData),
      credentials: 'include'
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
}