// src/services/GroupMembersService.ts
const API_URL = "http://10.219.65.2:5000/api/group";

export class GroupMembersService {
  // Get all members of a group
  static async getGroupMembers(groupId: string) {
    try {
      const response = await fetch(`${API_URL}/${groupId}/members`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('GroupMembersService.getGroupMembers error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load members'
      };
    }
  }

  // Remove a member from group (admin only)
  static async removeMember(groupId: string, memberId: string) {
    try {
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
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

  // Leave group
  static async leaveGroup(groupId: string) {
    try {
      const response = await fetch(`${API_URL}/${groupId}/leave`, {
        method: 'DELETE',
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

  // Get group info including invite code
  static async getGroupInfo(groupId: string) {
    try {
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
} 