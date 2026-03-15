// services/SwapRequestService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils
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
  createdAt: string;
  updatedAt: string;
  scope: 'week' | 'day';
  selectedDay?: string;
  selectedTimeSlotId?: string;
  
  assignment?: {
    id: string;
    dueDate: string;
    points: number;
    completed: boolean;
    task: {
      id: string;
      title: string;
      executionFrequency: string;
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

export interface SwapRequestResponse {
  success: boolean;
  message: string;
  data?: any;
  notifications?: {
    notifiedUsers?: number;
    notifiedAdmins?: number;
    notifiedRequester?: boolean;
    notifiedTarget?: boolean;
    notifiedAcceptor?: boolean;
  };
}

export class SwapRequestService {
  
  // ========== NO NEED FOR getAuthToken and getHeaders anymore - use TokenUtils directly ==========

  // CREATE: Request to swap an assignment
  static async createSwapRequest(data: CreateSwapRequestData): Promise<SwapRequestResponse> {
    try {
      console.log('SwapRequestService: Creating swap request', data);
      
      // Validate day scope
      if (data.scope === 'day' && !data.selectedDay) {
        return {
          success: false,
          message: 'Please select a day to swap',
        };
      }
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      console.log('Request headers:', headers);
      
      const response = await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('SwapRequestService: Create response', result);
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to create swap request: ${response.status}`);
      }
      
      // After successful creation, refresh notifications
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.createSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create swap request',
      };
    }
  }

  // CHECK: Check if assignment can be swapped
  static async checkCanSwap(assignmentId: string, scope?: 'week' | 'day') {
    try {
      let url = `${API_URL}/check/${assignmentId}`;
      if (scope) {
        url += `?scope=${scope}`;
      }
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for no JSON content
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

      console.log('SwapRequestService: Getting my swap requests', url);
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
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
      console.log('SwapRequestService: Get my requests response:', result);
      
      // Handle different response structures
      if (result.success) {
        // Check if data is directly in result or in result.data
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

      console.log('SwapRequestService: Getting pending requests for me', url);
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
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
      console.log('SwapRequestService: Get pending for me response:', result);
      
      // Handle different response structures
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
      console.log('SwapRequestService: Getting swap request details', requestId);
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
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
      console.log('SwapRequestService: Get details response:', result);
      
      // Handle different response structures
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
      console.log('SwapRequestService: Accepting swap request', requestId);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${requestId}/accept`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });

      const result = await response.json();
      console.log('SwapRequestService: Accept response', result);
      
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
      console.log('SwapRequestService: Rejecting swap request', requestId);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${requestId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason }),
        credentials: 'include'
      });

      const result = await response.json();
      console.log('SwapRequestService: Reject response', result);
      
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
      console.log('SwapRequestService: Cancelling swap request', requestId);
      
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
      const response = await fetch(`${API_URL}/${requestId}/cancel`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });

      const result = await response.json();
      console.log('SwapRequestService: Cancel response', result);
      
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

  // ===== NEW: Get group swap requests (for admin history view) =====
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

      console.log('SwapRequestService: Getting group swap requests', url);
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
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
      console.log('SwapRequestService: Get group requests response:', result);
      
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
  // (These don't need tokens, so they stay the same)

  // Get swap description text
  static getSwapDescription(swapRequest: SwapRequest): string {
    if (swapRequest.scope === 'day') {
      if (swapRequest.selectedTimeSlotId && swapRequest.selectedTimeSlot) {
        return `${swapRequest.selectedDay} at ${swapRequest.selectedTimeSlot.startTime}`;
      }
      return swapRequest.selectedDay || 'specific day';
    }
    return 'entire week';
  }

  // Get status color
  static getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return '#F59E0B';
      case 'ACCEPTED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      case 'CANCELLED':
        return '#6B7280';
      case 'EXPIRED':
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  }

  // Get status label
  static getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      case 'EXPIRED':
        return 'Expired';
      default:
        return status;
    }
  }

  // Get status icon
  static getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'time-outline';
      case 'ACCEPTED':
        return 'checkmark-circle';
      case 'REJECTED':
        return 'close-circle';
      case 'CANCELLED':
        return 'ban';
      case 'EXPIRED':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  }

  // Check if user can swap (time constraints)
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

  // Get day from due date
  static getDayFromDueDate(dueDate: string): string {
    const date = new Date(dueDate);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  // Format day for display
  static formatDay(day: string): string {
    return day.charAt(0) + day.slice(1).toLowerCase();
  }
}