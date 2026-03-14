// services/AssignmentService.ts - COMPLETE UPDATED WITH SECURESTORE
import { API_BASE_URL } from '../config/api';
import * as SecureStore from 'expo-secure-store';
import { NotificationService } from './NotificationService';

const API_URL = `${API_BASE_URL}/api/assignments`;

export interface Assignment {
  id: string;
  taskId: string;
  userId: string;
  dueDate: string;
  points: number;
  completed: boolean;
  completedAt?: string;
  verified: boolean | null;
  photoUrl?: string;
  notes?: string;
  adminNotes?: string;
  timeSlotId?: string;
  rotationWeek: number;
  weekStart: string;
  weekEnd: string;
  assignmentDay?: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  task?: {
    id: string;
    title: string;
    points: number;
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
    points?: number;
  };
}

export interface AssignmentDetails {
  id: string;
  taskId: string;
  userId: string;
  dueDate: string;
  points: number;
  completed: boolean;
  completedAt?: string;
  verified: boolean | null;
  photoUrl?: string;
  notes?: string;
  adminNotes?: string;
  timeSlotId?: string;
  rotationWeek: number;
  weekStart: string;
  weekEnd: string;
  assignmentDay?: string;
  user: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  task: {
    id: string;
    title: string;
    points: number;
    executionFrequency: string;
    group: {
      id: string;
      name: string;
      description?: string;
    };
    creator?: {
      id: string;
      fullName: string;
      avatarUrl?: string;
    };
  };
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
    points?: number;
  };
  timeValidation?: {
    allowed: boolean;
    reason?: string;
    timeLeft?: number;
    timeLeftText?: string;
    willBePenalized?: boolean;
    finalPoints?: number;
    originalPoints?: number;
  };
}

export interface TimeValidationResponse {
  success: boolean;
  message: string;
  data: {
    assignmentId: string;
    canSubmit: boolean;
    reason?: string;
    timeLeft?: number;
    timeLeftText?: string;
    submissionStart?: string;
    gracePeriodEnd?: string;
    currentTime: string;
    dueDate: string;
    timeSlot?: {
      id: string;
      startTime: string;
      endTime: string;
      label?: string;
      points?: number;
    };
    willBePenalized?: boolean;
    finalPoints?: number;
    originalPoints?: number;
  };
}

export interface UpcomingAssignment {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPoints: number;
  group: {
    id: string;
    name: string;
  };
  dueDate: string;
  isToday: boolean;
  canSubmit: boolean;
  timeLeft?: number;
  timeLeftText?: string;
  willBePenalized?: boolean;
  submissionInfo?: any;
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
    points?: number;
  };
  completed: boolean;
  verified: boolean | null;
}

export interface CompleteAssignmentParams {
  photoUri?: string;
  notes?: string;
}

export interface CompleteAssignmentResponse {
  success: boolean;
  message: string;
  assignment?: Assignment;
  isLate?: boolean;
  penaltyAmount?: number;
  originalPoints?: number;
  finalPoints?: number;
  notifications?: {
    notifiedAdmins: number;
    showSuccessNotification: boolean;
    notificationMessage: string;
  };
  validation?: any;
}

export interface VerifyAssignmentResponse {
  success: boolean;
  message: string;
  assignment?: Assignment;
  notifications?: {
    notifiedUser: boolean;
    notifiedOtherAdmins: number;
    userNotificationMessage: string;
  };
}

export interface TodayAssignment {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPoints: number;
  group: {
    id: string;
    name: string;
  };
  dueDate: string;
  canSubmit: boolean;
  timeLeft?: number;
  timeLeftText?: string;
  reason?: string;
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
    points?: number;
  };
  willBePenalized?: boolean;
  finalPoints?: number;
}

export class AssignmentService {
  
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
// ========== COMPLETE ASSIGNMENT ==========
static async completeAssignment(
  assignmentId: string, 
  data: CompleteAssignmentParams
): Promise<CompleteAssignmentResponse> {
  try {
    console.log('AssignmentService: Completing assignment', assignmentId, data);
    
    const token = await this.getAuthToken();
    
    if (data.photoUri) { 
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Add notes to formData if present
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      // Add the photo file - use 'photo' field name to match backend
      const filename = data.photoUri.split('/').pop() || 'photo.jpg';
      formData.append('photo', { // Changed back to 'photo'
        uri: data.photoUri,
        name: filename,
        type: 'image/jpeg',
      } as any); 
        
      // Prepare headers - DON'T set Content-Type, let browser set it with boundary
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('📤 Sending multipart form data with photo (field name: "photo")');
      
      const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
        method: 'POST',
        headers,
        body: formData,
      });

      // Try to parse response
      let result;
      const responseText = await response.text();
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid server response');
      }
      
      if (!response.ok) {
        throw new Error(result.message || `Failed: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;
      
    } else {
      // No photo - send as JSON
      const headers = await this.getHeaders(true); // with JSON content type
      
      console.log('📤 Sending JSON data without photo');
      
      const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notes: data.notes }),
      });

      // Try to parse response
      let result;
      const responseText = await response.text();
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error('Invalid server response');
      }
      
      if (!response.ok) {
        throw new Error(result.message || `Failed: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;
    }

  } catch (error: any) {
    console.error('AssignmentService.completeAssignment error:', error);
    return {
      success: false,
      message: error.message || 'Failed to complete assignment',
    };
  }
}

  
  // ========== VERIFY ASSIGNMENT ==========
  static async verifyAssignment(
    assignmentId: string, 
    data: { verified: boolean; adminNotes?: string; }
  ): Promise<VerifyAssignmentResponse> {
    try {
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${assignmentId}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Failed: ${response.status}`);
      }
      
      if (result.success) {
        await NotificationService.getUnreadCount();
      }
      
      return result;

    } catch (error: any) {
      console.error('AssignmentService.verifyAssignment error:', error);
      return { success: false, message: error.message || 'Failed to verify' };
    }
  }

  // ========== GET ASSIGNMENT DETAILS ==========
  static async getAssignmentDetails(assignmentId: string) {
    try {
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${assignmentId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`);
      }
      
      return await response.json();

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentDetails error:', error);
      return { success: false, message: error.message || 'Failed to load' };
    }
  }

  // ========== GET USER'S ASSIGNMENTS ==========
  static async getUserAssignments(
    userId: string, 
    filters?: { status?: string; week?: number; limit?: number; offset?: number; }
  ) {
    try {
      let url = `${API_URL}/user/${userId}`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week?.toString());
      if (filters?.limit) params.append('limit', filters.limit?.toString());
      if (filters?.offset) params.append('offset', filters.offset?.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`);
      }
      
      return await response.json();

    } catch (error: any) {
      console.error('AssignmentService.getUserAssignments error:', error);
      return { success: false, message: error.message || 'Failed to load' };
    }
  }

  // ========== GET TODAY'S ASSIGNMENTS ==========
  static async getTodayAssignments(groupId?: string) {
    try {
      let url = `${API_URL}/today`;
      if (groupId) url += `?groupId=${groupId}`;
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return {
          success: false,
          data: { assignments: [], currentTime: new Date().toISOString(), total: 0 }
        };
      }
      
      return await response.json();

    } catch (error: any) {
      console.error('AssignmentService.getTodayAssignments error:', error);
      return {
        success: false,
        data: { assignments: [], currentTime: new Date().toISOString(), total: 0 }
      };
    }
  }

  // ========== GET GROUP ASSIGNMENTS ==========
  static async getGroupAssignments(
    groupId: string, 
    filters?: { status?: string; week?: number; userId?: string; limit?: number; offset?: number; } 
  ) {
    try { 
      let url = `${API_URL}/group/${groupId}`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week?.toString());
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.limit) params.append('limit', filters.limit?.toString());
      if (filters?.offset) params.append('offset', filters.offset?.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`);
      }
      
      return await response.json();

    } catch (error: any) {
      console.error('AssignmentService.getGroupAssignments error:', error);
      return { success: false, message: error.message || 'Failed to load' };
    }
  }
 
  // ========== GET ASSIGNMENT STATISTICS ==========
  static async getAssignmentStats(groupId: string) {
    try {
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/group/${groupId}/stats`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`);
      }
      
      return await response.json();

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentStats error:', error);
      return { success: false, message: error.message || 'Failed to load' };
    }
  }

  // ========== CHECK SUBMISSION TIME ==========
  static async checkSubmissionTime(assignmentId: string): Promise<TimeValidationResponse> {
    try {
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${assignmentId}/check-time`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Server error: ${response.status}`,
          data: {
            assignmentId,
            canSubmit: false,
            dueDate: '',
            currentTime: new Date().toISOString(),
            reason: `Server error: ${response.status}`
          }
        };
      }
      
      return await response.json();

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
        data: {
          assignmentId,
          canSubmit: false,
          dueDate: '',
          currentTime: new Date().toISOString(),
          reason: 'Network error'
        }
      };
    }
  }

  // ========== GET UPCOMING ASSIGNMENTS ==========
  static async getUpcomingAssignments(options?: { groupId?: string; limit?: number; }) {
    try {
      let url = `${API_URL}/upcoming`;
      const params = new URLSearchParams();
      
      if (options?.groupId) params.append('groupId', options.groupId);
      if (options?.limit) params.append('limit', options.limit?.toString() || '10');
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      console.log('AssignmentService: Getting upcoming assignments', url);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        console.error('Response not OK:', response.status);
        return {
          success: false,
          data: { assignments: [], currentTime: new Date().toISOString(), total: 0 }
        };
      }
      
      const result = await response.json();
      console.log('AssignmentService: Upcoming response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getUpcomingAssignments error:', error);
      return {
        success: false,
        data: { assignments: [], currentTime: new Date().toISOString(), total: 0 }
      };
    }
  }

  // ========== LOCAL TIME VALIDATION HELPER ==========
  static validateLocalSubmissionTime(
    dueDate: string,
    timeSlot?: { startTime: string; endTime: string },
    currentTime: Date = new Date()
  ) {
    const due = new Date(dueDate);
    const current = currentTime;
    const isToday = due.toDateString() === current.toDateString();
    
    if (!isToday) {
      return { canSubmit: false, reason: 'Not due date', timeLeft: 0, isToday: false, willBePenalized: false };
    }
    
    if (!timeSlot) {
      return { canSubmit: true, isToday: true, willBePenalized: false };
    }
    
    const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
    const endTime = new Date(due);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000);
    const submissionStart = new Date(endTime.getTime() - 30 * 60000);
    
    if (current < submissionStart) {
      const timeUntilStart = submissionStart.getTime() - current.getTime();
      return {
        canSubmit: false,
        reason: 'Submission not open yet',
        timeLeft: Math.ceil(timeUntilStart / 1000),
        submissionStart,
        gracePeriodEnd,
        isToday: true,
        willBePenalized: false
      };
    }
    
    if (current <= endTime) {
      const timeLeft = endTime.getTime() - current.getTime();
      return {
        canSubmit: true,
        timeLeft: Math.ceil(timeLeft / 1000),
        timeLeftText: this.formatTimeLeft(Math.ceil(timeLeft / 1000)),
        submissionStart,
        gracePeriodEnd,
        isToday: true,
        willBePenalized: false
      };
    }
    
    if (current <= gracePeriodEnd) {
      const timeLeft = gracePeriodEnd.getTime() - current.getTime();
      return {
        canSubmit: true,
        timeLeft: Math.ceil(timeLeft / 1000),
        timeLeftText: this.formatTimeLeft(Math.ceil(timeLeft / 1000)),
        submissionStart,
        gracePeriodEnd,
        isToday: true,
        willBePenalized: true
      };
    }
    
    return {
      canSubmit: false,
      reason: 'Submission window closed',
      timeLeft: 0,
      gracePeriodEnd,
      isToday: true,
      willBePenalized: true
    };
  }

  // ========== FORMAT TIME LEFT ==========
  private static formatTimeLeft(seconds: number): string {
    if (seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  // ========== GET NOTIFICATION BADGE COUNT ==========
  static async getNotificationBadgeCount(): Promise<number> {
    try {
      const result = await NotificationService.getUnreadCount();
      return result.count || 0;
    } catch (error) {
      return 0;
    }
  }

  // ========== CHECK PENDING NOTIFICATIONS ==========
  static async hasPendingSubmissionNotifications(): Promise<boolean> {
    try {
      const result = await NotificationService.getNotifications(1, 10);
      
      if (result.success && result.notifications) {
        return result.notifications.some((n: any) => 
          n.type === 'SUBMISSION_PENDING' && n.read === false
        );
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

// Add these methods to AssignmentService class in AssignmentService.ts

// ========== GET USER NEGLECTED TASKS ==========
static async getUserNeglectedTasks(filters?: {
  groupId?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    let url = `${API_URL}/neglected/my`;
    const params = new URLSearchParams();
    
    if (filters?.groupId) params.append('groupId', filters.groupId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    console.log('AssignmentService: Getting user neglected tasks', url);
    
    const headers = await this.getHeaders(false);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('AssignmentService.getUserNeglectedTasks error:', error);
    return {
      success: false,
      message: error.message || 'Failed to load neglected tasks',
      data: { tasks: [], total: 0, count: 0 }
    };
  }
}

// ========== GET GROUP NEGLECTED TASKS (ADMIN ONLY) ==========
static async getGroupNeglectedTasks(
  groupId: string,
  filters?: {
    memberId?: string;
    limit?: number;
    offset?: number;
  }
) {
  try {
    let url = `${API_URL}/neglected/group/${groupId}`;
    const params = new URLSearchParams();
    
    if (filters?.memberId) params.append('memberId', filters.memberId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    console.log('AssignmentService: Getting group neglected tasks', url);
    
    const headers = await this.getHeaders(false);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('AssignmentService.getGroupNeglectedTasks error:', error);
    return {
      success: false,
      message: error.message || 'Failed to load group neglected tasks',
      data: { tasks: [], total: 0, count: 0, pointsByUser: {} }
    };
  }
}

// ========== GET NEGLECTED TASKS STATISTICS ==========
static async getNeglectedStats(groupId: string) {
  try {
    const headers = await this.getHeaders(false);
    
    const response = await fetch(`${API_URL}/neglected/group/${groupId}/stats`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result;

  } catch (error: any) {
    console.error('AssignmentService.getNeglectedStats error:', error);
    return {
      success: false,
      message: error.message || 'Failed to load neglected stats',
      data: { total: 0, totalPointsLost: 0, byUser: {} }
    };
  }
}
private static formatNeglectedNote(assignment: any): string {
  if (assignment.notes && assignment.notes.includes('[NEGLECTED]')) {
    return assignment.notes;
  }
  return `[NEGLECTED] Missed submission on ${new Date(assignment.dueDate).toLocaleDateString()}`;
}
}