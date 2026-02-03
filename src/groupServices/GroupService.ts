// src/services/GroupService.ts (React Native - FRONTEND)
const API_URL = "http://10.219.65.2:5000/api/group";

export class GroupService {
  // Create a new group
  static async createGroup(name: string, description?: string) {
    try {
      if (!name.trim()) {
        return {
          success: false,
          message: "Group name is required"
        };
      }

      console.log(`GroupService: Creating group "${name}"`);
      
      const response = await fetch(`${API_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || null
        }),
        credentials: 'include'
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

  // Get user's groups
  static async getUserGroups() {
    try {
      console.log("GroupService: Getting user groups...");
      
      const response = await fetch(`${API_URL}/my-groups`, {
        method: "GET",
        credentials: "include"
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

  // Join a group with invite code
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

      const response = await fetch(`${API_URL}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ inviteCode: cleanInviteCode }),
        credentials: "include"
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

  // Get group members with rotation info (NEW)
  static async getGroupMembers(groupId: string) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Getting members for group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/members`, {
        method: "GET",
        credentials: "include"
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

  // Update member rotation order (NEW)
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
      
      const response = await fetch(`${API_URL}/${groupId}/members/${memberId}/rotation`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          rotationOrder,
          isActive
        }),
        credentials: "include"
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

  // Reorder rotation sequence (NEW)
  static async reorderRotationSequence(groupId: string, newOrder: Array<{ memberId: string, rotationOrder: number }>) {
    try {
      if (!groupId || !newOrder || !Array.isArray(newOrder)) {
        return {
          success: false,
          message: "Group ID and new order array are required"
        };
      }

      console.log(`GroupService: Reordering rotation for group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/reorder-rotation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ newOrder }),
        credentials: "include"
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

  // Get rotation schedule preview (NEW)
  static async getRotationSchedulePreview(groupId: string, weeks: number = 4) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Getting rotation schedule for group ${groupId} (${weeks} weeks)`);
      
      const response = await fetch(`${API_URL}/${groupId}/rotation-schedule?weeks=${weeks}`, {
        method: "GET",
        credentials: "include"
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

  // Get group details (NEW)
  static async getGroupDetails(groupId: string) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Getting details for group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/details`, {
        method: "GET",
        credentials: "include"
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

  // Leave group (NEW)
  static async leaveGroup(groupId: string) {
    try {
      if (!groupId) {
        return {
          success: false,
          message: "Group ID is required"
        };
      }

      console.log(`GroupService: Leaving group ${groupId}`);
      
      const response = await fetch(`${API_URL}/${groupId}/leave`, {
        method: "POST",
        credentials: "include"
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