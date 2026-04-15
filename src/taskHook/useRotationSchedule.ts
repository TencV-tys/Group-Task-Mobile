// hooks/useRotationSchedule.ts - UPDATED with TokenUtils and Verified Count by Day

import { useState, useEffect, useCallback } from 'react';
import { TaskService } from '../services/TaskService';
import { TokenUtils } from '../utils/tokenUtils';
import { Alert } from 'react-native';

interface ScheduleItem {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  assigneeId?: string;
  week: number;
  dayOfWeek?: string;
  scheduledTime?: string;
  points: number;
  category?: string;
  status?: 'pending' | 'completed' | 'overdue';
  completed?: boolean;
}

interface WeekSchedule {
  weekNumber: number;
  weekLabel: string;
  tasks: ScheduleItem[];
  totalPoints: number;
  assignedTasksCount: number;
  startDate?: string;
  endDate?: string;
  verifiedByDay?: { [key: string]: number };
  totalVerified?: number;
}

interface UseRotationScheduleProps {
  groupId: string;
  initialWeeks?: number;
}

export const useRotationSchedule = ({ groupId, initialWeeks = 4 }: UseRotationScheduleProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeks, setWeeks] = useState<WeekSchedule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => {
        setAuthError(true);
        setError('Authentication required. Please log in again.');
      }
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  const generateWeekLabel = useCallback((weekNum: number, currentWeekNum: number): string => {
    const today = new Date();
    const weekDiff = weekNum - currentWeekNum;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + weekDiff * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (weekNum === currentWeekNum) {
      return `Current Week (${formatDate(startDate)} - ${formatDate(endDate)})`;
    } else if (weekNum < currentWeekNum) {
      return `Week ${weekNum} (${formatDate(startDate)} - ${formatDate(endDate)})`;
    } else {
      return `Future Week ${weekNum} (${formatDate(startDate)} - ${formatDate(endDate)})`;
    }
  }, []);

  const transformScheduleData = useCallback((scheduleData: any, currentWeekNum: number): WeekSchedule[] => {
    const weeksMap: { [week: number]: WeekSchedule } = {};
    
    console.log('Transforming schedule data:', scheduleData);
    
    if (Array.isArray(scheduleData)) {
      scheduleData.forEach((weekData: any) => {
        const weekNum = weekData.week || 1;
        
        if (weekNum > currentWeekNum) return;
        
        weeksMap[weekNum] = {
          weekNumber: weekNum,
          weekLabel: generateWeekLabel(weekNum, currentWeekNum),
          tasks: [],
          totalPoints: 0,
          assignedTasksCount: 0,
          startDate: weekData.weekStart,
          endDate: weekData.weekEnd,
          verifiedByDay: weekData.verifiedByDay || {
            Monday: 0, Tuesday: 0, Wednesday: 0,
            Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
          },
          totalVerified: weekData.totalVerified || 0
        };
        
        if (Array.isArray(weekData.tasks)) {
          weekData.tasks.forEach((task: any) => {
            console.log('🔍 Raw task data from API:', {
              taskId: task.taskId,
              taskTitle: task.taskTitle,
              selectedDays: task.selectedDays,
              dayOfWeek: task.dayOfWeek,
              dueDate: task.dueDate,
              assignee: task.assignee
            });
            
            let assigneeName = 'Unassigned';
            let assigneeId = '';
            
            if (task.assignee) {
              assigneeName = task.assignee.name || task.assignee.fullName || 'Unassigned';
              assigneeId = task.assignee.id || '';
            }
            
            // Get day of week properly - WITH dueDate fallback
            let dayOfWeek = '';
            if (task.selectedDays && task.selectedDays.length > 0) {
              dayOfWeek = task.selectedDays[0];
            } else if (task.dayOfWeek) {
              dayOfWeek = task.dayOfWeek;
            } else if (task.dueDate) {
              const dueDate = new Date(task.dueDate);
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              dayOfWeek = days[dueDate.getUTCDay()];
              console.log(`📅 Calculated day from dueDate for "${task.taskTitle}": ${dayOfWeek} (dueDate: ${task.dueDate})`);
            }
            
            let scheduledTime = '';
            if (task.timeSlots && task.timeSlots.length > 0) {
              scheduledTime = task.timeSlots[0].startTime;
            } else if (task.scheduledTime) {
              scheduledTime = task.scheduledTime;
            }
            
            const scheduleItem: ScheduleItem = {
              taskId: task.taskId,
              taskTitle: task.taskTitle,
              assigneeName: assigneeName,
              assigneeId: assigneeId,
              week: weekNum,
              dayOfWeek: dayOfWeek,
              scheduledTime: scheduledTime,
              points: task.points || 0,
              category: task.category,
              status: task.completed ? 'completed' : 'pending',
              completed: task.completed || false
            };
            
            weeksMap[weekNum].tasks.push(scheduleItem);
            weeksMap[weekNum].totalPoints += scheduleItem.points;
            if (assigneeName !== 'Unassigned') {
              weeksMap[weekNum].assignedTasksCount++;
            }
          });
        }
      });
    }
    
    return Object.values(weeksMap)
      .sort((a, b) => b.weekNumber - a.weekNumber);
  }, [generateWeekLabel]);

  // ✅ NEW: Get verified distribution by day
  
  // Load rotation schedule
  const loadRotationSchedule = useCallback(async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      console.log('Loading rotation schedule for group:', groupId);
      const result = await TaskService.getRotationSchedule(groupId, initialWeeks);
      console.log('Rotation schedule result:', result);
      
      if (result.success) { 
        const currentWeekNum = result.currentWeek || 1;
        let transformedWeeks: WeekSchedule[] = [];
        
        if (result.schedule && Array.isArray(result.schedule)) {
          transformedWeeks = transformScheduleData(result.schedule, currentWeekNum);
        } else {
          const startWeek = Math.max(1, currentWeekNum - initialWeeks + 1);
          
          for (let weekNum = startWeek; weekNum <= currentWeekNum; weekNum++) {
            transformedWeeks.push({
              weekNumber: weekNum,
              weekLabel: generateWeekLabel(weekNum, currentWeekNum),
              tasks: [],
              totalPoints: 0,
              assignedTasksCount: 0,
              verifiedByDay: {
                Monday: 0, Tuesday: 0, Wednesday: 0,
                Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
              },
              totalVerified: 0
            });
          }
          transformedWeeks.sort((a, b) => b.weekNumber - a.weekNumber);
        }
        
        console.log('Transformed weeks (past & current only):', transformedWeeks);
        setWeeks(transformedWeeks);
        setCurrentWeek(currentWeekNum);
        
        if (transformedWeeks.length > 0) {
          setSelectedWeek(currentWeekNum);
        }
        
      } else {
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
        setError(result.message || 'Failed to load rotation schedule');
      }
    } catch (error: any) {
      console.error('Error loading rotation schedule:', error);
      setError(error.message || 'Failed to load rotation schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, initialWeeks, transformScheduleData, generateWeekLabel, checkAuth]);

  const rotateTasks = useCallback(async () => {
    try {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        Alert.alert('Authentication Error', 'Please log in again');
        return false;
      }

      const result = await TaskService.rotateTasks(groupId);
      if (result.success) {
        Alert.alert('Success', `Tasks rotated to week ${result.newWeek}`);
        await loadRotationSchedule();
        return true;
      } else {
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth') ||
            result.message?.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
        Alert.alert('Error', result.message || 'Failed to rotate tasks');
        return false;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to rotate tasks');
      return false;
    }
  }, [groupId, loadRotationSchedule, checkAuth]);

  useEffect(() => {
    loadRotationSchedule();
  }, [loadRotationSchedule]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadRotationSchedule();
  }, [loadRotationSchedule]);

  const selectedWeekData = weeks.find(w => w.weekNumber === selectedWeek) || null;
  
  const getSelectedWeekTasks = useCallback(() => {
    if (!selectedWeek) return [];
    return selectedWeekData?.tasks || [];
  }, [selectedWeek, selectedWeekData]);

  const getTaskDistributionByDay = useCallback(() => {
    const tasks = selectedWeekData?.tasks || [];
    const distribution: { [key: string]: number } = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 
      'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };
    
    tasks.forEach(task => {
      if (task.dayOfWeek) {
        const day = task.dayOfWeek.charAt(0).toUpperCase() + task.dayOfWeek.slice(1).toLowerCase();
        if (distribution[day] !== undefined) {
          distribution[day]++;
        }
      }
    });
    
    return distribution;
  }, [selectedWeekData]);

  const getVerifiedDistributionByDay = useCallback(() => {
    if (!selectedWeekData?.verifiedByDay) {
      return {
        Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0,
        Friday: 0, Saturday: 0, Sunday: 0
      };
    }
    return selectedWeekData.verifiedByDay;
  }, [selectedWeekData]);


  const calculateFairnessScore = useCallback(() => {
    const tasks = selectedWeekData?.tasks || [];
    const pointsByAssignee: { [key: string]: number } = {};
    
    tasks.forEach(task => {
      if (task.assigneeName && task.assigneeName !== 'Unassigned') {
        pointsByAssignee[task.assigneeName] = (pointsByAssignee[task.assigneeName] || 0) + task.points;
      }
    });
    
    const values = Object.values(pointsByAssignee);
    if (values.length === 0) return 100;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 100;
    
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const fairness = 100 - Math.min(100, Math.round((variance / mean) * 100));
    return Math.max(0, fairness);
  }, [selectedWeekData]);

  return {
    loading,
    refreshing,
    weeks,
    selectedWeek,
    currentWeek,
    error,
    authError,
    selectedWeekData,
    setSelectedWeek,
    loadRotationSchedule,
    rotateTasks,
    refresh,
    getSelectedWeekTasks,
    getTaskDistributionByDay,
    getVerifiedDistributionByDay,  // ✅ NEW: Export this
    calculateFairnessScore,
    isEmpty: weeks.length === 0,
    hasSchedule: weeks.some(week => week.tasks.length > 0),
  };
};

export type { ScheduleItem, WeekSchedule };