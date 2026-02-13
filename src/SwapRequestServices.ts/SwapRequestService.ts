import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = `${API_BASE_URL}/api/swap-requests`;

export interface CreateSwapRequestData {
  assignmentId: string;
  reason?: string;
  targetUserId?: string;
  expiresAt?: string;
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
}

export interface SwapRequestFilters {
  status?: string;
  groupId?: string;
  limit?: number;
  offset?: number;
}

export class SwapRequestService {
  
  private static async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // CREATE: Request to swap an assignment
  static async createSwapRequest(data: CreateSwapRequestData) {
    try {
      console.log('SwapRequestService: Creating swap request', data);
      
      const headers = await this.getHeaders();
      
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
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.createSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create swap request',
        error: error.message
      };
    }
  }

  // GET: Get my swap requests (requests I created)
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
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load swap requests: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('SwapRequestService: My requests response', result);
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getMySwapRequests error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load swap requests',
        error: error.message,
        data: { requests: [], total: 0 }
      };
    }
  }

  // GET: Get pending swap requests for me (to accept/reject)
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
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load pending requests: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('SwapRequestService: Pending for me response', result);
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getPendingForMe error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load pending requests',
        error: error.message,
        data: { requests: [], total: 0 }
      };
    }
  }

  // GET: Get swap requests for a group (admin only)
  static async getGroupSwapRequests(groupId: string, filters?: { status?: string; limit?: number; offset?: number }) {
    try {
      let url = `${API_URL}/group/${groupId}`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      console.log('SwapRequestService: Getting group swap requests', url);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load group swap requests: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getGroupSwapRequests error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group swap requests',
        error: error.message,
        data: { requests: [], total: 0 }
      };
    }
  }

  // GET: Get single swap request details
  static async getSwapRequestDetails(requestId: string) {
    try {
      console.log('SwapRequestService: Getting swap request details', requestId);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${requestId}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load swap request: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.getSwapRequestDetails error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load swap request details',
        error: error.message
      };
    }
  }

  // GET: Check if assignment can be swapped
  static async checkCanSwap(assignmentId: string) {
    try {
      console.log('SwapRequestService: Checking if assignment can be swapped', assignmentId);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/check/${assignmentId}`, {
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

  // UPDATE: Accept a swap request
  static async acceptSwapRequest(requestId: string) {
    try {
      console.log('SwapRequestService: Accepting swap request', requestId);
      
      const headers = await this.getHeaders();
      
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
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.acceptSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to accept swap request',
        error: error.message
      };
    }
  }

  // UPDATE: Reject a swap request
  static async rejectSwapRequest(requestId: string, reason?: string) {
    try {
      console.log('SwapRequestService: Rejecting swap request', requestId);
      
      const headers = await this.getHeaders();
      
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
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.rejectSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to reject swap request',
        error: error.message
      };
    }
  }

  // UPDATE: Cancel a swap request (only by requester)
  static async cancelSwapRequest(requestId: string) {
    try {
      console.log('SwapRequestService: Cancelling swap request', requestId);
      
      const headers = await this.getHeaders();
      
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
      
      return result;

    } catch (error: any) {
      console.error('SwapRequestService.cancelSwapRequest error:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel swap request',
        error: error.message
      };
    }
  }

  // Helper: Check if user can swap (time constraints)
  static canRequestSwap(dueDate: string): { canSwap: boolean; reason?: string } {
    const now = new Date();
    const due = new Date(dueDate);
    
    // Cannot swap for past assignments
    if (due < now) {
      return { canSwap: false, reason: 'Assignment is already overdue' };
    }
    
    // Calculate 24 hours before due date
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

  // Helper: Get status badge color
  static getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return '#F59E0B'; // Orange
      case 'ACCEPTED':
        return '#10B981'; // Green
      case 'REJECTED':
        return '#EF4444'; // Red
      case 'CANCELLED':
        return '#6B7280'; // Gray
      case 'EXPIRED':
        return '#9CA3AF'; // Light Gray
      default:
        return '#6B7280';
    }
  }

  // Helper: Get status label
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

  // Helper: Get status icon
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
}