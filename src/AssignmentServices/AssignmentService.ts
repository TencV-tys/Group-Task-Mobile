// src/services/AssignmentService.ts - COMPLETE VERSION WITH TIME VALIDATION
import { API_BASE_URL } from '../config/api';

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

export class AssignmentService {
  
  // Complete an assignment
  static async completeAssignment(assignmentId: string, data: {
    photoUrl?: string;
    notes?: string;
  }) {
    try {
      console.log('AssignmentService: Completing assignment', assignmentId, data);
      
      const response = await fetch(`${API_URL}/${assignmentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      console.log('AssignmentService: Complete response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.completeAssignment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to complete assignment'
      };
    }
  }

  // Verify an assignment (admin only)
  static async verifyAssignment(assignmentId: string, data: {
    verified: boolean;
    adminNotes?: string;
  }) {
    try {
      console.log('AssignmentService: Verifying assignment', assignmentId, data);
      
      const response = await fetch(`${API_URL}/${assignmentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      console.log('AssignmentService: Verify response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.verifyAssignment error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify assignment'
      };
    }
  }

  // Get assignment details
  static async getAssignmentDetails(assignmentId: string) {
    try {
      console.log('AssignmentService: Getting assignment details', assignmentId);
      
      const response = await fetch(`${API_URL}/${assignmentId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      console.log('AssignmentService: Details response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentDetails error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load assignment details'
      };
    }
  }

  // Get user's assignments
  static async getUserAssignments(userId: string, filters?: {
    status?: string;
    week?: number;
    limit?: number;
    offset?: number;
  }) {
    try {
      let url = `${API_URL}/user/${userId}/assignments`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      console.log('AssignmentService: Getting user assignments', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getUserAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load user assignments'
      };
    }
  }

  // Get group assignments (admin only)
  static async getGroupAssignments(groupId: string, filters?: {
    status?: string;
    week?: number;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      let url = `${API_URL}/group/${groupId}/assignments`;
      const params = new URLSearchParams();
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.week) params.append('week', filters.week.toString());
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      console.log('AssignmentService: Getting group assignments', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getGroupAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load group assignments'
      };
    }
  }

  // Get assignment statistics
  static async getAssignmentStats(groupId: string) {
    try {
      const url = `${API_URL}/group/${groupId}/stats`;
      console.log('AssignmentService: Getting assignment stats', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      console.error('AssignmentService.getAssignmentStats error:', error);
      return {
        success: false,
        message: error.message || 'Failed to load assignment stats'
      };
    }
  }

  // ===================== TIME VALIDATION METHODS =====================

  // Check if assignment can be submitted (time validation)
  static async checkSubmissionTime(assignmentId: string): Promise<TimeValidationResponse> {
    try {
      console.log('AssignmentService: Checking submission time for', assignmentId);
      
      const response = await fetch(`${API_URL}/${assignmentId}/check-time`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('AssignmentService.checkSubmissionTime error:', result.message);
        return {
          success: false,
          message: result.message || 'Failed to check submission time',
          data: {
            assignmentId,
            dueDate: '',
            canSubmit: false,
            currentTime: new Date().toISOString(),
            reason: result.message || 'Error checking time'
          }
        };
      }

      console.log('AssignmentService: Time check response', result);
      return result;

    } catch (error: any) {
      console.error('AssignmentService.checkSubmissionTime error:', error);
      return {
        success: false,
        message: error.message || 'Network error',
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
      let url = `${API_URL}/upcoming/assignments`;
      const params = new URLSearchParams();
      
      if (options?.groupId) params.append('groupId', options.groupId);
      if (options?.limit) params.append('limit', options.limit.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      console.log('AssignmentService: Getting upcoming assignments', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('AssignmentService.getUpcomingAssignments error:', result.message);
        return {
          success: false,
          message: result.message || 'Failed to load upcoming assignments',
          data: {
            assignments: [],
            currentTime: new Date().toISOString(),
            total: 0
          }
        };
      }

      return result;

    } catch (error: any) {
      console.error('AssignmentService.getUpcomingAssignments error:', error);
      return {
        success: false,
        message: error.message || 'Network error',
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
  } {
    const due = new Date(dueDate);
    const current = currentTime;
    
    // Check if it's the due date
    if (due.toDateString() !== current.toDateString()) {
      return {
        canSubmit: false,
        reason: 'Not due date',
        timeLeft: 0
      };
    }
    
    // If no time slot, allow any time on due date
    if (!timeSlot) {
      return { canSubmit: true };
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
        gracePeriodEnd
      };
    }
    
    if (current <= gracePeriodEnd) {
      const timeLeft = gracePeriodEnd.getTime() - current.getTime();
      return {
        canSubmit: true,
        timeLeft: Math.ceil(timeLeft / 1000), // seconds
        timeLeftText: this.formatTimeLeft(Math.ceil(timeLeft / 1000)),
        submissionStart,
        gracePeriodEnd
      };
    }
    
    return {
      canSubmit: false,
      reason: 'Submission window closed',
      timeLeft: 0,
      gracePeriodEnd
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

  // Get current time slot information for a task
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
      // Since we don't have a direct API endpoint for this yet,
      // we'll use a combination of existing endpoints
      // You should create this endpoint on the backend
      
      // For now, let's get the task details and check locally
      const taskResponse = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'GET',
        credentials: 'include'
      });

      const taskData = await taskResponse.json();
      
      if (!taskData.success) {
        return {
          success: false,
          message: taskData.message || 'Failed to load task info'
        };
      }

      const task = taskData.task;
      const now = new Date();
      const today = now.toDateString();
      
      // Find today's assignment
      const todaysAssignment = task.assignments?.find((assignment: Assignment) => {
        const dueDate = new Date(assignment.dueDate);
        return dueDate.toDateString() === today;
      });

      // Local validation
      const validation = todaysAssignment 
        ? this.validateLocalSubmissionTime(
            todaysAssignment.dueDate,
            todaysAssignment.timeSlot,
            now
          )
        : { canSubmit: false, reason: 'No assignment today' };

      return {
        success: true,
        message: 'Time slot info retrieved',
        data: {
          hasAssignmentToday: !!todaysAssignment,
          assignment: todaysAssignment,
          currentTimeSlot: todaysAssignment?.timeSlot,
          nextTimeSlot: null, // Would need backend support
          isSubmittable: validation.canSubmit,
          timeLeft: validation.timeLeft,
          timeLeftText: validation.timeLeftText,
          submissionInfo: validation,
          currentTime: now.toISOString()
        }
      };

    } catch (error: any) {
      console.error('AssignmentService.getCurrentTimeSlotInfo error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get time slot info'
      };
    }
  }

  // Batch check multiple assignments
  static async batchCheckSubmissionTimes(assignmentIds: string[]): Promise<{
    success: boolean;
    message: string;
    data: Record<string, {
      canSubmit: boolean;
      reason?: string;
      timeLeft?: number;
      timeLeftText?: string;
    }>;
  }> {
    try {
      // Since we don't have a batch endpoint yet,
      // we'll check them individually
      // You should create a batch endpoint on the backend
      
      const results: Record<string, any> = {};
      
      for (const assignmentId of assignmentIds) {
        try {
          const check = await this.checkSubmissionTime(assignmentId);
          if (check.success) {
            results[assignmentId] = {
              canSubmit: check.data.canSubmit,
              reason: check.data.reason,
              timeLeft: check.data.timeLeft,
              timeLeftText: check.data.timeLeftText
            };
          } else {
            results[assignmentId] = {
              canSubmit: false,
              reason: check.message || 'Error checking'
            };
          }
        } catch (error) {
          results[assignmentId] = {
            canSubmit: false,
            reason: 'Network error'
          };
        }
      }

      return {
        success: true,
        message: 'Batch check completed',
        data: results
      };

    } catch (error: any) {
      console.error('AssignmentService.batchCheckSubmissionTimes error:', error);
      return {
        success: false,
        message: error.message || 'Failed to batch check submission times',
        data: {}
      };
    }
  }
}