// services/AssignmentService.ts - FIXED AND COMPLETE VERSION
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

export interface TimeValidationResponse {
  success: boolean;
  message: string;
  data: {
    assignmentId: string;
    assignmentTitle?: string;
    dueDate: string;
    canSubmit: boolean;
    reason?: string;
    timeLeft?: number;
    timeLeftText?: string;
    submissionStart?: string;
    gracePeriodEnd?: string;
    currentTime: string;
    timeSlot?: {
      id: string;
      startTime: string;
      endTime: string;
      label?: string;
      points?: number;
    };
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
  photoFile?: File;
}

export class AssignmentService {
  
  // Get authentication token
  private static async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Get request headers with auth
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

 // Complete an assignment WITH PHOTO UPLOAD (Simplified for React Native)
static async completeAssignment(
  assignmentId: string, 
  data: CompleteAssignmentParams
) {
  try {
    console.log('AssignmentService: Completing assignment', assignmentId, data);
    
    const token = await this.getAuthToken();
    
    // Always use FormData for React Native when we have a photo
    if (data.photoUri) {
      const formData = new FormData();
      
      // Add notes if provided
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      // Add photo - React Native FormData format
      const filename = data.photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('photo', {
        uri: data.photoUri,
        name: filename,
        type,
      } as any);
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData
      
      console.log('Sending FormData with photo to:', `${API_URL}/${assignmentId}/complete`);
      
      const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();
      console.log('AssignmentService: Complete response (with photo)', result);
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to complete assignment: ${response.status}`);
      }
      
      return result;
    } else {
      // No photo, use JSON
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          notes: data.notes
        }),
      });

      const result = await response.json();
      console.log('AssignmentService: Complete response', result);
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to complete assignment: ${response.status}`);
      }
      
      return result;
    }

  } catch (error: any) {
    console.error('AssignmentService.completeAssignment error:', error);
    return {
      success: false,
      message: error.message || 'Failed to complete assignment. Please check your connection.',
      error: error.message 
    };
  }
}
  
  // Verify an assignment (admin only)
  static async verifyAssignment(
    assignmentId: string, 
    data: { 
      verified: boolean; 
      adminNotes?: string;
    }
  ) {
    try {
      console.log('AssignmentService: Verifying assignment', assignmentId, data);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/${assignmentId}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('AssignmentService: Verify response', result);
      
      if (!response.ok) {
        throw new Error(result.message || `Failed to verify assignment: ${response.status}`);
      }
      
      return result;

    } catch (error: any) {
      console.error('AssignmentService.verifyAssignment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify assignment',
        error: error.message
      };
    }
  }

  // Get assignment details
  static async getAssignmentDetails(assignmentId: string) {
    try {
      console.log('AssignmentService: Getting assignment details', assignmentId);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${assignmentId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load assignment: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('AssignmentService: Details response', result);
      
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentDetails error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load assignment details. Please check your connection.',
        error: error.message
      };
    }
  }

  // Get user's assignments
  static async getUserAssignments(
    userId: string, 
    filters?: {
      status?: string;
      week?: number;
      limit?: number;
      offset?: number;
    }
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

      console.log('AssignmentService: Getting user assignments', url);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load assignments: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getUserAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load assignments',
        error: error.message
      };
    }
  }

  // Get today's assignments
  static async getTodayAssignments(groupId?: string) {
    try {
      let url = `${API_URL}/today`;
      if (groupId) {
        url += `?groupId=${groupId}`;
      }
      
      console.log('AssignmentService: Getting today assignments', url);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load today assignments: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getTodayAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load today assignments',
        error: error.message
      };
    }
  }

  // Get group assignments (admin only)
  static async getGroupAssignments(
    groupId: string, 
    filters?: {
      status?: string;
      week?: number;
      userId?: string;
      limit?: number;
      offset?: number;
    }
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

      console.log('AssignmentService: Getting group assignments', url);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load group assignments: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getGroupAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group assignments',
        error: error.message
      };
    }
  }

  // Get assignment statistics
  static async getAssignmentStats(groupId: string) {
    try {
      const url = `${API_URL}/group/${groupId}/stats`;
      console.log('AssignmentService: Getting assignment stats', url);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load assignment stats: ${response.status}`);
      }
      
      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentStats error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load assignment statistics',
        error: error.message
      };
    }
  }

  // ===================== TIME VALIDATION METHODS =====================

  // Check if assignment can be submitted (time validation)
  static async checkSubmissionTime(assignmentId: string): Promise<TimeValidationResponse> {
    try {
      console.log('AssignmentService: Checking submission time for', assignmentId);
      
      const headers = await this.getHeaders(false);
      
      const response = await fetch(`${API_URL}/${assignmentId}/check-time`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AssignmentService.checkSubmissionTime HTTP error:', response.status, errorText);
        return {
          success: false,
          message: `Server error: ${response.status}`,
          data: {
            assignmentId,
            dueDate: '',
            canSubmit: false,
            currentTime: new Date().toISOString(),
            reason: `Server error: ${response.status}`
          }
        };
      }
      
      const result = await response.json();
      console.log('AssignmentService: Time check response', result);
      
      if (!result.success) {
        console.error('AssignmentService.checkSubmissionTime API error:', result.message);
      }
      
      return result;

    } catch (error: any) {
      console.error('AssignmentService.checkSubmissionTime error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
        data: {
          assignmentId,
          dueDate: '',
          canSubmit: false,
          currentTime: new Date().toISOString(),
          reason: 'Network error'
        }
      };
    }
  }

  // Get upcoming assignments with time information
  static async getUpcomingAssignments(options?: {
    groupId?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      assignments: UpcomingAssignment[];
      currentTime: string;
      total: number;
    };
  }> {
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
        throw new Error(`Failed to load upcoming assignments: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('AssignmentService.getUpcomingAssignments API error:', result.message);
      }
      
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getUpcomingAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load upcoming assignments',
        data: {
          assignments: [],
          currentTime: new Date().toISOString(),
          total: 0
        }
      };
    }
  }

  // Local time validation helper (for immediate UI feedback)
  static validateLocalSubmissionTime(
    dueDate: string,
    timeSlot?: { startTime: string; endTime: string },
    currentTime: Date = new Date()
  ): {
    canSubmit: boolean;
    reason?: string;
    timeLeft?: number; // seconds
    timeLeftText?: string;
    submissionStart?: Date;
    gracePeriodEnd?: Date;
    isToday?: boolean;
  } {
    const due = new Date(dueDate);
    const current = currentTime;
    const isToday = due.toDateString() === current.toDateString();
    
    // Check if it's the due date
    if (!isToday) {
      return {
        canSubmit: false,
        reason: 'Not due date',
        timeLeft: 0,
        isToday: false
      };
    }
    
    // If no time slot, allow any time on due date
    if (!timeSlot) {
      return { 
        canSubmit: true,
        isToday: true
      };
    }
    
    // Parse time slot end time
    const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
    const endTime = new Date(due);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    // 30 minute grace period after end time
    const gracePeriodEnd = new Date(endTime.getTime() + 30 * 60000);
    
    // Submission opens 30 minutes before end time
    const submissionStart = new Date(endTime.getTime() - 30 * 60000);
    
    if (current < submissionStart) {
      const timeUntilStart = submissionStart.getTime() - current.getTime();
      return {
        canSubmit: false,
        reason: 'Submission not open yet',
        timeLeft: 0,
        submissionStart,
        gracePeriodEnd,
        isToday: true
      };
    }
    
    if (current <= gracePeriodEnd) {
      const timeLeft = gracePeriodEnd.getTime() - current.getTime();
      return {
        canSubmit: true,
        timeLeft: Math.ceil(timeLeft / 1000), // seconds
        timeLeftText: this.formatTimeLeft(Math.ceil(timeLeft / 1000)),
        submissionStart,
        gracePeriodEnd,
        isToday: true
      };
    }
    
    return {
      canSubmit: false,
      reason: 'Submission window closed',
      timeLeft: 0,
      gracePeriodEnd,
      isToday: true
    };
  }

  // Format time left in human-readable format
  private static formatTimeLeft(seconds: number): string {
    if (seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Helper: Create File from image URI (for React Native)
  static async createFileFromUri(uri: string, fileName: string = 'photo.jpg'): Promise<File> {
    try {
      // For React Native, you might need a different approach
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a File from Blob
      const file = new File([blob], fileName, { type: blob.type });
      return file;
    } catch (error) {
      console.error('Error creating file from URI:', error);
      throw error;
    }
  }

  // Helper: Upload photo and get URL (if your backend supports separate upload)
  static async uploadPhoto(photoUri: string): Promise<{ success: boolean; photoUrl?: string; message?: string }> {
    try {
      const file = await this.createFileFromUri(photoUri);
      const formData = new FormData();
      formData.append('photo', file);
      
      const token = await this.getAuthToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/upload/photo`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('AssignmentService.uploadPhoto error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload photo'
      };
    }
  }

  // Get current time slot info for a task
  static async getCurrentTimeSlotInfo(taskId: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      hasAssignmentToday: boolean;
      assignment?: Assignment;
      currentTimeSlot?: {
        id: string;
        startTime: string;
        endTime: string;
        label?: string;
        points?: number;
      };
      nextTimeSlot?: {
        id: string;
        startTime: string;
        endTime: string;
        label?: string;
        points?: number;
      };
      isSubmittable: boolean;
      timeLeft?: number;
      timeLeftText?: string;
      submissionInfo?: any;
      currentTime: string;
    };
  }> {
    try {
      const headers = await this.getHeaders(false);
      
      // Use task endpoint to get time slot info
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/time-slot-info`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load time slot info: ${response.status}`);
      }
      
      const result = await response.json();
      
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getCurrentTimeSlotInfo error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get time slot info'
      };
    }
  }
}