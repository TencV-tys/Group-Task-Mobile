// services/AssignmentService.ts - UPDATED with TokenUtils
import { API_BASE_URL } from '../config/api';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 Import TokenUtils
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
  timeSlotId?: string;
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


// services/AssignmentService.ts - UPDATE TodayAssignment interface

export interface TodayAssignment {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPoints: number;
  points: number; 
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
  
  // ✅ ADD THESE MISSING FIELDS
  completed?: boolean;
  verified?: boolean | null;
  expired?: boolean;
  photoUrl?: string | null;
  partiallyExpired?: boolean;
  completedTimeSlotIds?: string[];
  missedTimeSlotIds?: string[];
  timeSlots?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    label?: string;
    points?: number;
  }>;
}

 
export class AssignmentService {
  

  // services/AssignmentService.ts - FIXED with null checks

static async completeAssignment(
  assignmentId: string, 
  data: CompleteAssignmentParams 
): Promise<CompleteAssignmentResponse> { 
  try {
    console.log('\n📸🔵 [completeAssignment] FRONTEND START 🔵📸');
    console.log('   Assignment ID:', assignmentId);
    console.log('   Photo URI:', data.photoUri);
    console.log('   timeSlotId:', data.timeSlotId);
    
    const token = await TokenUtils.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        message: 'No authentication token found'
      };
    }
    
    const fullUrl = `${API_URL}/${assignmentId}/complete`;
    console.log('📤 URL:', fullUrl);
    
    let response;
    
    // ✅ Check if photoUri exists and is a local file
    const isLocalFile = data.photoUri && 
                        !data.photoUri.startsWith('http://') && 
                        !data.photoUri.startsWith('https://');
    
    const isRemoteUrl = data.photoUri && 
                        (data.photoUri.startsWith('http://') || data.photoUri.startsWith('https://'));
    
    if (isLocalFile && data.photoUri) {
      // ✅ Local file - upload as multipart/form-data
      console.log('📸 Local file detected - uploading as FormData');
      
      const formData = new FormData();
      
      if (data.notes) {
        formData.append('notes', data.notes);
      }
      
      if (data.timeSlotId) {
        formData.append('timeSlotId', data.timeSlotId);
        console.log('⏰ Adding timeSlotId to formData:', data.timeSlotId);
      }
      
      const uri = data.photoUri;
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
      
      formData.append('file', {
        uri: uri,
        name: filename,
        type: mimeType,
      } as any);
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        response = await fetch(fullUrl, {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
      
    } else {
      // ✅ Remote URL (Cloudinary) or no photo - send as JSON
      console.log('📸 Remote URL or no photo - sending as JSON');
      
      const headers = await TokenUtils.getAuthHeaders(true);
      
      const requestBody: any = { notes: data.notes };
      if (data.timeSlotId) {
        requestBody.timeSlotId = data.timeSlotId;
      }
      if (isRemoteUrl && data.photoUri) {
        requestBody.photoUrl = data.photoUri;  // ← Send Cloudinary URL as photoUrl
        console.log('📸 Sending Cloudinary URL:', data.photoUri);
      }
      
      console.log('📤 Sending JSON body:', requestBody);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        response = await fetch(fullUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    }
    
    if (!response) {
      throw new Error('No response from server');
    }
    
    const responseText = await response.text();
    console.log('📥 Response text:', responseText.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', responseText);
      return {
        success: false,
        message: 'Invalid server response'
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        message: result.message || `HTTP ${response.status}: ${response.statusText}`
      };
    } 
    
    return result;

  } catch (error: any) {
    console.error('❌ AssignmentService.completeAssignment error:', error);
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
      // ✅ Use TokenUtils.getAuthHeaders()
      const headers = await TokenUtils.getAuthHeaders();
      
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
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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

    console.log('📥 [getUserAssignments] Fetching from URL:', url);
    
    const headers = await TokenUtils.getAuthHeaders(false);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('📥 [getUserAssignments] Response status:', response.status);

    if (!response.ok) {
      console.error('❌ [getUserAssignments] HTTP error:', response.status);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('📥 [getUserAssignments] Response keys:', Object.keys(result));
    
    const assignments = result.assignments || [];
    console.log(`✅ [getUserAssignments] Got ${assignments.length} assignments for user ${userId}`);
    
    // Log first assignment if exists
    if (assignments.length > 0) {
      console.log('📋 [getUserAssignments] First assignment:', {
        id: assignments[0].id,
        title: assignments[0].taskTitle,
        dueDate: assignments[0].dueDate,
        isDueToday: assignments[0].isDueToday
      });
    }
    
    // ✅ IMPORTANT: Log the new fields from backend
    console.log('📊 [getUserAssignments] Backend points summary:', {
      totalPossiblePoints: result.totalPossiblePoints,
      earnedPoints: result.earnedPoints
    });
    
    // ✅ Return the backend fields at the root level
    return {
      success: true,
      data: { 
        assignments: assignments,
        total: result.total || assignments.length
      },
      totalPossiblePoints: result.totalPossiblePoints || 0,  // ✅ ADD THIS
      earnedPoints: result.earnedPoints || 0,               // ✅ ADD THIS
      message: result.message || 'Assignments retrieved successfully'
    };

  } catch (error: any) {
    console.error('❌ [getUserAssignments] Error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to load assignments',
      data: { assignments: [], total: 0 },
      totalPossiblePoints: 0,
      earnedPoints: 0
    };
  }
}
 
// services/AssignmentService.ts - FIXED getTodayAssignments

static async getTodayAssignments(groupId?: string) {
  console.log('🔵🔵🔵 [FRONTEND] getTodayAssignments CALLED 🔵🔵🔵');
  console.log('   Group ID:', groupId);
  console.log('   Current time:', new Date().toISOString());
  
  try {
    console.log('📅 Getting today\'s assignments for group:', groupId);
    
    const user = await TokenUtils.getUser();
    if (!user) {
      console.log('❌ No user found');
      return {
        success: false,
        data: { assignments: [], currentTime: new Date().toISOString(), total: 0 },
        message: 'User not found'
      };
    }
    
    console.log('👤 Current user ID:', user.id);
    
    const userAssignmentsResult = await this.getUserAssignments(user.id);
    
    console.log('📊 [getTodayAssignments] getUserAssignments result:', {
      success: userAssignmentsResult.success,
      message: userAssignmentsResult.message,
      assignmentsLength: userAssignmentsResult.data?.assignments?.length
    });
    
    if (!userAssignmentsResult.success) {
      return {
        success: false,
        data: { assignments: [], currentTime: new Date().toISOString(), total: 0 },
        message: userAssignmentsResult.message
      };
    }
    
    const allAssignments = userAssignmentsResult.data?.assignments || [];
    console.log(`📊 Total assignments found: ${allAssignments.length}`);
    
    if (allAssignments.length > 0) {
      console.log('📋 All assignments:');
      allAssignments.forEach((a: any, i: number) => {
        console.log(`   ${i+1}. ${a.taskTitle} - Due: ${a.dueDate} - Completed: ${a.completed} - IsDueToday: ${a.isDueToday} - HasPhoto: ${!!a.photoUrl}`);
      });
    }
    
    const now = new Date();
    const startOfDayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));
    const endOfDayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23, 59, 59, 999
    ));
    
    console.log('📅 Today\'s UTC date range:', {
      start: startOfDayUTC.toISOString(),
      end: endOfDayUTC.toISOString(),
      current: now.toISOString()
    });
    
    const todayAssignments = allAssignments.filter((assignment: any) => {
      // ✅ Skip completed assignments
      if (assignment.completed) {
        console.log(`⏭️ Skipping completed: ${assignment.taskTitle}`);
        return false;
      }
      
      // ✅ Skip assignments with photo (already submitted, pending verification)
      if (assignment.photoUrl) {
        console.log(`⏭️ Skipping already submitted (pending verification): ${assignment.taskTitle}`);
        return false;
      }
      
      // ✅ Skip verified or rejected
      if (assignment.verified === true || assignment.verified === false) {
        console.log(`⏭️ Skipping verified/rejected: ${assignment.taskTitle}`);
        return false;
      }
      
      if (!assignment.dueDate) {
        console.log(`⏭️ No due date: ${assignment.taskTitle}`);
        return false;
      }
      
      const dueDate = new Date(assignment.dueDate);
      const isDueToday = dueDate >= startOfDayUTC && dueDate <= endOfDayUTC;
      const belongsToGroup = !groupId || assignment.group?.id === groupId;
      
      if (isDueToday) {
        console.log(`✅✅✅ DUE TODAY: ${assignment.taskTitle} (${assignment.id})`);
        console.log(`   Due date UTC: ${dueDate.toISOString()}`);
        console.log(`   Current UTC: ${now.toISOString()}`);
        console.log(`   Has photo: ${!!assignment.photoUrl}`);
        console.log(`   Verified: ${assignment.verified}`);
        console.log(`   Expired: ${assignment.expired}`);
        console.log(`   Backend finalPoints: ${assignment.finalPoints}`);
        console.log(`   Backend willBePenalized: ${assignment.willBePenalized}`);
      }
      
      return isDueToday && belongsToGroup;
    });
    
    console.log(`📋 Found ${todayAssignments.length} assignments due today`);
    
    // ✅ USE BACKEND VALUES - NO LOCAL RECALCULATION
    const formattedAssignments = todayAssignments.map((assignment: any) => {
      // Just use what the backend already calculated
      console.log(`📝 Assignment: ${assignment.taskTitle}`, {
        backend_finalPoints: assignment.finalPoints,
        backend_willBePenalized: assignment.willBePenalized,
        backend_submissionStatus: assignment.submissionStatus,
        backend_timeLeft: assignment.timeLeft,
        completed: assignment.completed,
        verified: assignment.verified,
        expired: assignment.expired,
        hasPhoto: !!assignment.photoUrl
      });
      
      return {
        id: assignment.id,
        taskId: assignment.taskId,
        taskTitle: assignment.taskTitle,
        taskPoints: assignment.points,
        points: assignment.points,  // ✅ Use backend points
        group: assignment.group,
        dueDate: assignment.dueDate,
        // ✅ USE BACKEND VALIDATION VALUES
        canSubmit: assignment.canSubmit ?? false,
        timeLeft: assignment.timeLeft,
        timeLeftText: assignment.timeLeftText,
        reason: assignment.reason,
        timeSlot: assignment.timeSlot,
        willBePenalized: assignment.willBePenalized ?? false,
        finalPoints: assignment.finalPoints ?? assignment.points,  // ✅ Use backend finalPoints
        submissionStatus: assignment.submissionStatus,
        // ✅ CRITICAL FIELDS FOR STATUS CHECKING
        completed: assignment.completed,
        verified: assignment.verified,
        expired: assignment.expired,
        photoUrl: assignment.photoUrl,
        partiallyExpired: assignment.partiallyExpired,
        completedTimeSlotIds: assignment.completedTimeSlotIds,
        missedTimeSlotIds: assignment.missedTimeSlotIds,
        timeSlots: assignment.timeSlots
      };
    });
    
    console.log(`🏁 Returning ${formattedAssignments.length} assignments`);
    return {
      success: true,
      data: {
        assignments: formattedAssignments,
        currentTime: now.toISOString(),
        total: formattedAssignments.length 
      },
      message: 'Today\'s assignments retrieved successfully'
    }; 
    
  } catch (error: any) {
    console.error('❌ AssignmentService.getTodayAssignments error:', error);
    return {
      success: false,
      data: { assignments: [], currentTime: new Date().toISOString(), total: 0 },
      message: error.message || 'Failed to load today\'s assignments'
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

      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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

  static async getUpcomingAssignments(options?: { groupId?: string; limit?: number; }) {
  try {
    let url = `${API_URL}/upcoming`;
    const params = new URLSearchParams();
    
    if (options?.groupId) params.append('groupId', options.groupId);
    if (options?.limit) params.append('limit', options.limit?.toString() || '10');
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    console.log('AssignmentService: Getting upcoming assignments', url);
    
    const headers = await TokenUtils.getAuthHeaders(false);
    
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
    
    // ✅ FIXED: Ensure dates are properly formatted for display
    if (result.success && result.data?.assignments) {
      result.data.assignments = result.data.assignments.map((assignment: any) => ({
        ...assignment,
        dueDate: assignment.dueDate,
        // Add local time display property if needed
        dueDateLocal: new Date(assignment.dueDate).toLocaleString()
      }));
    }
    
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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
      
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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
      // ✅ Use TokenUtils.getAuthHeaders() with false for GET requests
      const headers = await TokenUtils.getAuthHeaders(false);
      
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

 
// services/AssignmentService.ts - Keep as is (working version)

static validateLocalSubmissionTime(
  dueDate: string,
  timeSlot?: { startTime: string; endTime: string },
  currentTime: Date = new Date()
) {
  const due = new Date(dueDate);
  const current = currentTime;
  
  // UTC date comparison
  const isDueToday =
    due.getUTCFullYear() === current.getUTCFullYear() &&
    due.getUTCMonth() === current.getUTCMonth() &&
    due.getUTCDate() === current.getUTCDate();
  
  if (!isDueToday) {
    return { canSubmit: false, reason: 'Not due date', timeLeft: 0, isToday: false, willBePenalized: false };
  }
  
  if (!timeSlot) {
    return { canSubmit: true, isToday: true, willBePenalized: false };
  }
  
  const [endHour, endMinute] = timeSlot.endTime.split(':').map(Number);
  
  // Convert PHT (UTC+8) to UTC
  let utcHour = endHour - 8;
  if (utcHour < 0) utcHour += 24;
  
  const endTime = new Date(Date.UTC(
    due.getUTCFullYear(),
    due.getUTCMonth(),
    due.getUTCDate(),
    utcHour, endMinute, 0, 0
  ));
  
  const submissionStart = endTime;
  const onTimeEnd = new Date(endTime.getTime() + 25 * 60000);
  const lateWindowEnd = new Date(endTime.getTime() + 30 * 60000);
  
  if (current < submissionStart) {
    const timeUntilStart = submissionStart.getTime() - current.getTime();
    return {
      canSubmit: false,
      reason: 'Submission not open yet',
      timeLeft: Math.ceil(timeUntilStart / 1000),
      timeLeftText: this.formatTimeLeft(Math.ceil(timeUntilStart / 1000)),
      isToday: true,
      willBePenalized: false
    };
  }
  
  if (current <= onTimeEnd) {
    const timeLeft = onTimeEnd.getTime() - current.getTime();
    return {
      canSubmit: true,
      timeLeft: Math.ceil(timeLeft / 1000),
      timeLeftText: this.formatTimeLeft(Math.ceil(timeLeft / 1000)),
      isToday: true,
      willBePenalized: false
    };
  }
  
  if (current <= lateWindowEnd) {
    const timeLeft = lateWindowEnd.getTime() - current.getTime();
    return {
      canSubmit: true,
      timeLeft: Math.ceil(timeLeft / 1000),
      timeLeftText: this.formatTimeLeft(Math.ceil(timeLeft / 1000)),
      isToday: true,
      willBePenalized: true
    };
  }
  
  return {
    canSubmit: false,
    reason: 'Submission window closed',
    timeLeft: 0,
    isToday: true,
    willBePenalized: true
  };
}

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

  private static formatNeglectedNote(assignment: any): string {
    if (assignment.notes && assignment.notes.includes('[NEGLECTED]')) {
      return assignment.notes;
    }
    return `[NEGLECTED] Missed submission on ${new Date(assignment.dueDate).toLocaleDateString()}`;
  }

  // In AssignmentService.ts (frontend) - ADD THIS METHOD

static async getPendingVerifications(groupId: string, options?: { limit?: number; offset?: number }) {
  try {
    const { limit = 20, offset = 0 } = options || {};
    const url = `${API_URL}/group/${groupId}/pending-verifications?limit=${limit}&offset=${offset}`;
    
    console.log('📥 [getPendingVerifications] Fetching from:', url);
    
    const headers = await TokenUtils.getAuthHeaders(false);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ [getPendingVerifications] Response:', {
      success: result.success,
      total: result.data?.total,
      assignmentsCount: result.data?.assignments?.length
    });
    
    return result;
    
  } catch (error: any) {
    console.error('❌ [getPendingVerifications] Error:', error);
    return {
      success: false,
      message: error.message || 'Failed to load pending verifications',
      data: { assignments: [], total: 0, hasMore: false }
    };
  }
}
}