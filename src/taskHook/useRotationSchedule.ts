// src/hooks/useRotationSchedule.ts
import { useState, useEffect, useCallback } from 'react';
import { TaskService } from '../taskServices/TaskService';
import { Alert } from 'react-native';

interface ScheduleItem {
  taskId: string;
  taskTitle: string;
  assigneeName: string;
  week: number;
  dayOfWeek?: string;
  scheduledTime?: string;
  points: number;
  category?: string;
  status?: 'pending' | 'completed' | 'overdue';
}

interface WeekSchedule {
  weekNumber: number;
  weekLabel: string;
  tasks: ScheduleItem[];
  totalPoints: number;
  assignedTasksCount: number;
  startDate?: string;
  endDate?: string;
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
  const [viewType, setViewType] = useState<'weekly' | 'task'>('weekly');
  const [error, setError] = useState<string | null>(null);

  // Generate week labels (e.g., "Week 1 (Jan 1-7)")
  const generateWeekLabel = (weekNum: number): string => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (weekNum - currentWeek) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return `Week ${weekNum} (${formatDate(startDate)} - ${formatDate(endDate)})`;
  };

  // Transform schedule data from API
  const transformScheduleData = useCallback((scheduleData: any): WeekSchedule[] => {
    const weeksMap: { [week: number]: WeekSchedule } = {};
    
    if (scheduleData.assignments) {
      scheduleData.assignments.forEach((assignment: any) => {
        const weekNum = assignment.week || 1;
        
        if (!weeksMap[weekNum]) {
          weeksMap[weekNum] = {
            weekNumber: weekNum,
            weekLabel: generateWeekLabel(weekNum),
            tasks: [],
            totalPoints: 0,
            assignedTasksCount: 0
          };
        }
        
        const scheduleItem: ScheduleItem = {
          taskId: assignment.taskId,
          taskTitle: assignment.task?.title || 'Unnamed Task',
          assigneeName: assignment.assignedTo?.fullName || 'Unassigned',
          week: weekNum,
          dayOfWeek: assignment.dayOfWeek,
          scheduledTime: assignment.scheduledTime,
          points: assignment.task?.points || 0,
          category: assignment.task?.category,
          status: assignment.status
        };
        
        weeksMap[weekNum].tasks.push(scheduleItem);
        weeksMap[weekNum].totalPoints += scheduleItem.points;
        weeksMap[weekNum].assignedTasksCount++;
      });
    }
    
    // Convert map to array, sort by week, and calculate week dates
    return Object.values(weeksMap)
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map(week => ({
        ...week,
        weekLabel: generateWeekLabel(week.weekNumber)
      }));
  }, [currentWeek]);

  // Load rotation schedule
  const loadRotationSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Loading rotation schedule for group ${groupId}, weeks: ${initialWeeks}`);
      
      const result = await TaskService.getRotationSchedule(groupId, initialWeeks);
      
      if (result.success) {
        if (result.schedule) {
          const transformedWeeks = transformScheduleData(result.schedule);
          setWeeks(transformedWeeks);
          
          if (result.currentWeek) {
            setCurrentWeek(result.currentWeek);
            setSelectedWeek(result.currentWeek);
          } else if (transformedWeeks.length > 0) {
            setSelectedWeek(transformedWeeks[0].weekNumber);
          }
        } else {
          // No schedule data yet
          setWeeks([]);
        }
      } else {
        setError(result.message || 'Failed to load rotation schedule');
        Alert.alert('Error', result.message || 'Failed to load rotation schedule');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load rotation schedule';
      setError(errorMessage);
      console.error('Error loading rotation schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, initialWeeks, transformScheduleData]);

  // Rotate tasks to next week
  const rotateTasks = useCallback(async () => {
    try {
      const result = await TaskService.rotateTasks(groupId);
      
      if (result.success) {
        Alert.alert('Success', `Tasks rotated to week ${result.newWeek}`);
        await loadRotationSchedule(); // Refresh schedule
        return true;
      } else {
        Alert.alert('Error', result.message || 'Failed to rotate tasks');
        return false;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to rotate tasks');
      return false;
    }
  }, [groupId, loadRotationSchedule]);

  // Reassign a task
  const reassignTask = useCallback(async (taskId: string, targetUserId: string) => {
    try {
      const result = await TaskService.reassignTask(taskId, targetUserId);
      
      if (result.success) {
        Alert.alert('Success', 'Task reassigned successfully');
        await loadRotationSchedule(); // Refresh schedule
        return true;
      } else {
        Alert.alert('Error', result.message || 'Failed to reassign task');
        return false;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reassign task');
      return false;
    }
  }, [loadRotationSchedule]);

  // Get tasks for selected week
  const getSelectedWeekTasks = useCallback((): ScheduleItem[] => {
    if (!selectedWeek) return [];
    const weekData = weeks.find(w => w.weekNumber === selectedWeek);
    return weekData?.tasks || [];
  }, [weeks, selectedWeek]);

  // Get task distribution by day
  const getTaskDistributionByDay = useCallback((): { [key: string]: number } => {
    const tasks = getSelectedWeekTasks();
    const distribution: { [key: string]: number } = {
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0,
      'Sunday': 0
    };

    tasks.forEach(task => {
      if (task.dayOfWeek && distribution[task.dayOfWeek]) {
        distribution[task.dayOfWeek]++;
      }
    });

    return distribution;
  }, [getSelectedWeekTasks]);

  // Get task distribution by assignee
  const getTaskDistributionByAssignee = useCallback((): { [key: string]: number } => {
    const tasks = getSelectedWeekTasks();
    const distribution: { [key: string]: number } = {};

    tasks.forEach(task => {
      if (task.assigneeName) {
        distribution[task.assigneeName] = (distribution[task.assigneeName] || 0) + 1;
      }
    });

    return distribution;
  }, [getSelectedWeekTasks]);

  // Get points distribution by assignee
  const getPointsDistribution = useCallback((): { [key: string]: number } => {
    const tasks = getSelectedWeekTasks();
    const distribution: { [key: string]: number } = {};

    tasks.forEach(task => {
      if (task.assigneeName) {
        distribution[task.assigneeName] = (distribution[task.assigneeName] || 0) + task.points;
      }
    });

    return distribution;
  }, [getSelectedWeekTasks]);

  // Check if a week has tasks
  const hasTasks = useCallback((weekNumber: number): boolean => {
    const weekData = weeks.find(w => w.weekNumber === weekNumber);
    return !!(weekData && weekData.tasks.length > 0);
  }, [weeks]);

  // Get upcoming weeks (with or without tasks)
  const getUpcomingWeeks = useCallback((includeEmpty: boolean = false): WeekSchedule[] => {
    if (includeEmpty) {
      return weeks;
    }
    return weeks.filter(week => week.tasks.length > 0);
  }, [weeks]);

  // Calculate fairness score (lower is more fair)
  const calculateFairnessScore = useCallback((): number => {
    const pointsDistribution = getPointsDistribution();
    const values = Object.values(pointsDistribution);
    
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    
    // Normalize to 0-100 scale (0 is perfectly fair)
    return Math.min(100, Math.round((variance / mean) * 100));
  }, [getPointsDistribution]);

  // Initialize on mount
  useEffect(() => {
    loadRotationSchedule();
  }, [loadRotationSchedule]);

  // Refresh function
  const refresh = useCallback(() => {
    setRefreshing(true);
    loadRotationSchedule();
  }, [loadRotationSchedule]);

  return {
    // State
    loading,
    refreshing,
    weeks,
    selectedWeek,
    currentWeek,
    viewType,
    error,
    
    // Setters
    setSelectedWeek,
    setViewType,
    
    // Functions
    loadRotationSchedule,
    rotateTasks,
    reassignTask,
    refresh,
    
    // Data getters
    getSelectedWeekTasks,
    getTaskDistributionByDay,
    getTaskDistributionByAssignee,
    getPointsDistribution,
    hasTasks,
    getUpcomingWeeks,
    calculateFairnessScore,
    
    // Week info
    selectedWeekData: weeks.find(w => w.weekNumber === selectedWeek) || null,
    currentWeekData: weeks.find(w => w.weekNumber === currentWeek) || null,
    
    // Status
    isEmpty: weeks.length === 0,
    hasSchedule: weeks.some(week => week.tasks.length > 0),
  };
};
 
export type { ScheduleItem, WeekSchedule };