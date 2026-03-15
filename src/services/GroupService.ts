// src/services/GroupService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils

const API_URL = `${API_BASE_URL}/api/group`;

export class GroupService {
  
  // ========== NO NEED FOR getAuthToken and getHeaders anymore - use TokenUtils directly ==========

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
      console.log(`GroupService: Description received:`, description);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      // Determine what to send
      let descriptionValue = null;
      if (description !== undefined && description !== null) {
        const trimmed = description.trim();
        if (trimmed.length > 0) {
          descriptionValue = trimmed;
          console.log(`GroupService: Using description:`, trimmed);
        } else {
          console.log(`GroupService: Description is empty string, sending null`);
        }
      } else {
        console.log(`GroupService: Description is ${description}, sending null`);
      }
      
      const body = {
        name: name.trim(),
        description: descriptionValue
      };
      
      console.log(`GroupService: Final request body:`, body);
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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

      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
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