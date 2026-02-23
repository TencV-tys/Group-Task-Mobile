// services/AssignmentService.ts - SIMPLE VERSION (LIKE TASKSERVICE)
import { API_BASE_URL } from '../config/api';
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
  
  // ========== COMPLETE ASSIGNMENT ==========
  static async completeAssignment(
    assignmentId: string, 
    data: CompleteAssignmentParams
  ): Promise<CompleteAssignmentResponse> {
    try {
      console.log('AssignmentService: Completing assignment', assignmentId, data);
      
      if (data.photoUri) {
        const formData = new FormData();
        if (data.notes) formData.append('notes', data.notes);
        
        const filename = data.photoUri.split('/').pop() || 'photo.jpg';
        formData.append('photo', {
          uri: data.photoUri,
          name: filename,
          type: 'image/jpeg',
        } as any);
        
        const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || `Failed: ${response.status}`);
        }
        
        if (result.success) {
          await NotificationService.getUnreadCount();
        }
        
        return result;
      } else {
        const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: data.notes }),
          credentials: 'include'
        });

        const result = await response.json();
        
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
      const response = await fetch(`${API_URL}/${assignmentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
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
      const response = await fetch(`${API_URL}/${assignmentId}`, {
        method: 'GET',
        credentials: 'include'
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

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
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
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
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

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
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
      const response = await fetch(`${API_URL}/group/${groupId}/stats`, {
        method: 'GET',
        credentials: 'include'
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
      const response = await fetch(`${API_URL}/${assignmentId}/check-time`, {
        method: 'GET',
        credentials: 'include'
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
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
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
}