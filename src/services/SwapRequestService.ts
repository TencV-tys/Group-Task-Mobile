// services/SwapRequestService.ts - COMPLETE FIXED VERSION

import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils';
import { NotificationService } from './NotificationService';

const API_URL = `${API_BASE_URL}/api/swap-requests`;

export interface CreateSwapRequestData {
  assignmentId: string;
  reason?: string;
  targetUserId?: string;
  expiresAt?: string;
  scope?: 'week' | 'day';
  selectedDay?: string;
  selectedTimeSlotId?: string;
}
 

export interface SwapRequest {
  id: string;
  assignmentId: string;
  reason?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  requestedBy: string;
  targetUserId?: string;
  expiresAt?: string;
  createdAt: string;  // ✅ Add this
  updatedAt: string;
  scope: 'week' | 'day';
  selectedDay?: string;
  selectedTimeSlotId?: string;
  
  // Admin approval fields
  requiresAdminApproval: boolean;
  adminApproved: boolean | null;
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  adminRejectionReason?: string;
  autoApproved: boolean;
  acceptedBy?: string;
  acceptedAt?: string;
  
  assignment?: {
    id: string;
    dueDate: string;
    points: number;
    completed: boolean;
    task: {
      id: string;
      title: string;
      executionFrequency: string;
      points: number;  // ✅ Add points here
      group?: {
        id: string;
        name: string;
      };
      timeSlots?: Array<{
        id: string;
        startTime: string;
        endTime: string;
        label?: string;
      }>;
    };
    timeSlot?: {
      id: string;
      startTime: string;
      endTime: string;
      label?: string;
    };
    user?: {
      id: string;
      fullName: string;
      avatarUrl?: string;
    };
  };
  requester?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  targetUser?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  selectedTimeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
  };
}

export interface SwapRequestFilters {
  status?: string;
  groupId?: string;
  limit?: number;
  offset?: number;
}

// services/SwapRequestService.ts - UPDATE THE SwapRequestResponse INTERFACE

export interface SwapRequestResponse {
  success: boolean;
  message: string;
  data?: any;
  swapRequest?: any;
  notifications?: {
    notifiedUsers?: number;
    notifiedAdmins?: number;
    notifiedRequester?: boolean;
    notifiedTarget?: boolean;
    notifiedAcceptor?: boolean;
  };
  requiresAdminApproval?: boolean;
  eligibleMembersCount?: number;
  // ✅ Add these properties for acceptSwapRequest response
  scope?: 'week' | 'day';
  selectedDay?: string;
  transferredCount?: number;
  previousAssignee?: {
    id: string;
    name: string;
  };
  newAssignee?: {
    id: string;
    name: string;
  };
  requesterNewAssignments?: any[];
  acceptorNewAssignments?: any[];
  requesterTaskCount?: number;
  acceptorTaskCount?: number;
}

export class SwapRequestService {
  
  // CREATE: Request to swap an assignment
  static async createSwapRequest(data: CreateSwapRequestData): Promise<SwapRequestResponse> {
    try {
      console.log('SwapRequestService: Creating swap request', data);
      
      if (data.scope === 'day' && !data.selectedDay) {
        return {
          success: false,
          message: 'Please select a day to swap',
        };
      }
      
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      console.log('SwapRequestService: Create response', result);
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to create swap request: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return {
        success: result.success,
        message: result.message,
        data: result.data,
        swapRequest: result.swapRequest,
        notifications: result.notifications,
        requiresAdminApproval: result.requiresAdminApproval,
        eligibleMembersCount: result.eligibleMembersCount
      };

    } catch (error: any) {
      console.error('SwapRequestService.createSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create swap request',
      };
    }
  }

  // GET: Pending swap requests for admin approval
  static async getPendingForAdminApproval(groupId: string, filters?: { limit?: number; offset?: number }) {
    try {
      let url = `${API_URL}/admin/pending/${groupId}`;
      const params = new URLSearchParams();
      
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load pending approvals: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getPendingForAdminApproval error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load pending approvals',
        requests: [],
        total: 0
      };
    }
  }

  // POST: Admin approve swap request
  static async adminApproveSwapRequest(requestId: string, notes?: string): Promise<SwapRequestResponse> {
    try {
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/admin/${requestId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notes }),
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to approve swap request: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.adminApproveSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to approve swap request',
      };
    }
  }

  // POST: Admin reject swap request
  static async adminRejectSwapRequest(requestId: string, reason: string): Promise<SwapRequestResponse> {
    try {
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/admin/${requestId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to reject swap request: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.adminRejectSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to reject swap request',
      };
    }
  }

  // CHECK: Check if assignment can be swapped
  static async checkCanSwap(assignmentId: string, scope?: 'week' | 'day', selectedDay?: string) {
    try {
      let url = `${API_URL}/check/${assignmentId}`;
      const params = new URLSearchParams();
      if (scope) params.append('scope', scope);
      if (selectedDay && scope === 'day') params.append('selectedDay', selectedDay);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to check swap status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.checkCanSwap error:', error);
      return {
        success: false,
        canSwap: false,
        message: error.message || 'Failed to check swap status'
      };
    }
  }

  // CHECK: Check if a user has an assignment on a specific day
  static async checkUserHasAssignmentOnDay(
    userId: string,
    groupId: string,
    day: string,
    week: number
  ): Promise<{ hasAssignment: boolean; assignment?: any }> {
    try {
      const headers = await TokenUtils.getAuthHeaders(false);
      
      const url = `${API_URL}/check-user-assignment?targetUserId=${encodeURIComponent(userId)}&groupId=${encodeURIComponent(groupId)}&day=${encodeURIComponent(day)}&week=${week}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to check user assignment: ${response.status}`);
      }
      
      const result = await response.json();
      return {
        hasAssignment: result.hasAssignment || false,
        assignment: result.assignment || null
      };

    } catch (error: any) {
      console.error('SwapRequestService.checkUserHasAssignmentOnDay error:', error);
      return { hasAssignment: false };
    }
  }

  // GET: Get my swap requests
  static async getMySwapRequests(filters?: SwapRequestFilters) {
    try {
      let url = `${API_URL}/my-requests`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.groupId) params.append('groupId', filters.groupId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load swap requests: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const requests = result.data?.requests || result.requests || [];
        const total = result.data?.total || result.total || requests.length;
        
        return {
          success: true,
          data: {
            requests,
            total
          }
        };
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getMySwapRequests error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load swap requests',
        data: { requests: [], total: 0 }
      };
    }
  }

  // GET: Get pending swap requests for me
  static async getPendingForMe(filters?: { groupId?: string; limit?: number; offset?: number }) {
    try {
      let url = `${API_URL}/pending-for-me`;
      const params = new URLSearchParams();
      
      if (filters?.groupId) params.append('groupId', filters.groupId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });
 
      if (!response.ok) {
        throw new Error(`Failed to load pending requests: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const requests = result.data?.requests || result.requests || [];
        const total = result.data?.total || result.total || requests.length;
        
        return {
          success: true,
          data: {
            requests,
            total
          }
        };
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getPendingForMe error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load pending requests',
        data: { requests: [], total: 0 }
      };
    }
  }

  // GET: Get swap request details by ID
  static async getSwapRequestDetails(requestId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(`${API_URL}/${requestId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load swap request: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data || result.swapRequest || result,
          message: result.message || 'Request details loaded'
        };
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getSwapRequestDetails error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load swap request details',
      };
    }
  }

  // ACCEPT: Accept a swap request
  static async acceptSwapRequest(requestId: string): Promise<SwapRequestResponse> {
    try {
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${requestId}/accept`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to accept swap request: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.acceptSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to accept swap request',
      };
    }
  }

  // REJECT: Reject a swap request
  static async rejectSwapRequest(requestId: string, reason?: string): Promise<SwapRequestResponse> {
    try {
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${requestId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to reject swap request: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.rejectSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to reject swap request',
      };
    }
  }

  // CANCEL: Cancel a swap request
  static async cancelSwapRequest(requestId: string): Promise<SwapRequestResponse> {
    try {
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${requestId}/cancel`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to cancel swap request: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.cancelSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel swap request',
      };
    }
  }

  // GET: Get group swap requests (for admin history view)
  static async getGroupSwapRequests(
    groupId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      let url = `${API_URL}/group/${groupId}`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const headers = await TokenUtils.getAuthHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load group swap requests: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: {
            requests: result.data?.requests || result.requests || [],
            total: result.data?.total || result.total || 0,
            stats: result.data?.stats || result.stats
          }
        };
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getGroupSwapRequests error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group swap requests',
        data: { requests: [], total: 0 }
      };
    }
  }

  // ============= HELPER METHODS =============

  static getSwapDescription(swapRequest: SwapRequest): string {
    if (swapRequest.scope === 'day') {
      if (swapRequest.selectedTimeSlotId && swapRequest.selectedTimeSlot) {
        return `${swapRequest.selectedDay} at ${swapRequest.selectedTimeSlot.startTime}`;
      }
      return swapRequest.selectedDay || 'specific day';
    }
    return 'entire week';
  }

  static getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return '#F59E0B';
      case 'ACCEPTED': return '#10B981';
      case 'REJECTED': return '#EF4444';
      case 'CANCELLED': return '#6B7280';
      case 'EXPIRED': return '#9CA3AF';
      default: return '#6B7280';
    }
  }

  static getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'ACCEPTED': return 'Accepted';
      case 'REJECTED': return 'Rejected';
      case 'CANCELLED': return 'Cancelled';
      case 'EXPIRED': return 'Expired';
      default: return status;
    }
  }

  static getStatusIcon(status: string): string {
  switch (status) {
    case 'PENDING': return 'clock-outline';  // ✅ Valid Material Community icon
    case 'ACCEPTED': return 'check-circle';
    case 'REJECTED': return 'close-circle';
    case 'CANCELLED': return 'ban';
    case 'EXPIRED': return 'alert-circle';
    default: return 'help-circle';
  }
}

  static getAdminApprovalStatus(swapRequest: SwapRequest): { label: string; color: string; icon: string } {
    if (!swapRequest.requiresAdminApproval) {
      return { label: 'Auto-approved', color: '#10B981', icon: 'check-circle' };
    }
    if (swapRequest.adminApproved === true) {
      return { label: 'Admin Approved', color: '#10B981', icon: 'check-circle' };
    }
    if (swapRequest.adminApproved === false) {
      return { label: 'Admin Rejected', color: '#EF4444', icon: 'close-circle' };
    }
    return { label: 'Awaiting Admin Approval', color: '#F59E0B', icon: 'clock-outline' };
  }

  static canRequestSwap(dueDate: string): { canSwap: boolean; reason?: string } {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (due < now) {
      return { canSwap: false, reason: 'Assignment is already overdue' };
    }
    
    const twentyFourHoursBefore = new Date(due);
    twentyFourHoursBefore.setHours(twentyFourHoursBefore.getHours() - 24);
    
    if (now > twentyFourHoursBefore) {
      return { 
        canSwap: false, 
        reason: 'Cannot swap assignments less than 24 hours before due date' 
      };
    }
    
    return { canSwap: true };
  }

  static getDayFromDueDate(dueDate: string): string {
    const date = new Date(dueDate);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  static formatDay(day: string): string {
    return day.charAt(0) + day.slice(1).toLowerCase();
  } 

// CHECK: Check if a user has any assignments this week (for WEEK swap exchange)
static async checkUserHasAnyAssignmentThisWeek(
  userId: string,
  groupId: string,
  week: number
): Promise<{ hasAssignment: boolean; assignmentCount?: number; assignments?: any[] }> {
  try {
    const headers = await TokenUtils.getAuthHeaders(false);
    
    const url = `${API_URL}/check-user-week-assignments?targetUserId=${encodeURIComponent(userId)}&groupId=${encodeURIComponent(groupId)}&week=${week}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to check user week assignments: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      hasAssignment: result.hasAssignment || false,
      assignmentCount: result.assignmentCount || 0,
      assignments: result.assignments || []
    };

  } catch (error: any) {
    console.error('SwapRequestService.checkUserHasAnyAssignmentThisWeek error:', error);
    return { hasAssignment: false, assignmentCount: 0, assignments: [] };
  }
}
// BATCH check for multiple users' assignments on a specific day
static async batchCheckUserAssignments(params: {
  userIds: string[];
  groupId: string;
  day: string; 
  week: number;
}): Promise<{ success: boolean; results?: Array<{ userId: string; hasAssignmentOnDay: boolean; hasAnyAssignmentThisWeek: boolean }> }> {
  try {
    const headers = await TokenUtils.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/batch-check-assignments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Batch check failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('SwapRequestService.batchCheckUserAssignments error:', error);
    return { success: false };
  }
}

// BATCH check for multiple users' week assignments
static async batchCheckUserWeekAssignments(params: {
  userIds: string[];
  groupId: string;
  week: number;
}): Promise<{ success: boolean; results?: Array<{ userId: string; hasAnyAssignmentThisWeek: boolean; assignmentCount?: number }> }> {
  try {
    const headers = await TokenUtils.getAuthHeaders();
    
    const response = await fetch(`${API_URL}/batch-check-week-assignments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Batch week check failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('SwapRequestService.batchCheckUserWeekAssignments error:', error);
    return { success: false };
  }
}

}  