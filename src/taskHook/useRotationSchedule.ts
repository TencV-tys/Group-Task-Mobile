import { useState, useEffect, useCallback } from 'react';
import { TaskService } from '../services/TaskService';
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
}

interface UseRotationScheduleProps {
  groupId: string;
  initialWeeks?: number; // Number of past weeks to show (including current)
}
 
export const useRotationSchedule = ({ groupId, initialWeeks = 4 }: UseRotationScheduleProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeks, setWeeks] = useState<WeekSchedule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Generate week labels
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
        
        // Include only current and past weeks (weekNum <= currentWeekNum)
        if (weekNum > currentWeekNum) return;
        
        weeksMap[weekNum] = {
          weekNumber: weekNum,
          weekLabel: generateWeekLabel(weekNum, currentWeekNum),
          tasks: [],
          totalPoints: 0,
          assignedTasksCount: 0,
          startDate: weekData.weekStart,
          endDate: weekData.weekEnd
        };
        
        if (Array.isArray(weekData.tasks)) {
          weekData.tasks.forEach((task: any) => {
            // Extract assignee name properly
            let assigneeName = 'Unassigned';
            let assigneeId = '';
            
            if (task.assignee) {
              assigneeName = task.assignee.name || task.assignee.fullName || 'Unassigned';
              assigneeId = task.assignee.id || '';
            }
            
            // Get day of week properly
            let dayOfWeek = '';
            if (task.selectedDays && task.selectedDays.length > 0) {
              dayOfWeek = task.selectedDays[0];
            } else if (task.dayOfWeek) {
              dayOfWeek = task.dayOfWeek;
            }
            
            // Get scheduled time
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
    
    // Sort weeks in descending order (newest first - current week at top)
    return Object.values(weeksMap)
      .sort((a, b) => b.weekNumber - a.weekNumber);
  }, [generateWeekLabel]);

  // Load rotation schedule
  const loadRotationSchedule = useCallback(async () => {
    try {
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
          // Create empty weeks for current and past weeks only
          const startWeek = Math.max(1, currentWeekNum - initialWeeks + 1);
          
          for (let weekNum = startWeek; weekNum <= currentWeekNum; weekNum++) {
            transformedWeeks.push({
              weekNumber: weekNum,
              weekLabel: generateWeekLabel(weekNum, currentWeekNum),
              tasks: [],
              totalPoints: 0,
              assignedTasksCount: 0
            });
          }
          // Sort descending (newest first)
          transformedWeeks.sort((a, b) => b.weekNumber - a.weekNumber);
        }
        
        console.log('Transformed weeks (past & current only):', transformedWeeks);
        setWeeks(transformedWeeks);
        setCurrentWeek(currentWeekNum);
        
        // Set selected week to current week
        if (transformedWeeks.length > 0) {
          setSelectedWeek(currentWeekNum);
        }
        
      } else {
        setError(result.message || 'Failed to load rotation schedule');
      }
    } catch (error: any) {
      console.error('Error loading rotation schedule:', error);
      setError(error.message || 'Failed to load rotation schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, initialWeeks, transformScheduleData, generateWeekLabel]);

  const rotateTasks = useCallback(async () => {
    try {
      const result = await TaskService.rotateTasks(groupId);
      if (result.success) {
        Alert.alert('Success', `Tasks rotated to week ${result.newWeek}`);
        await loadRotationSchedule();
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

  // Initialize
  useEffect(() => {
    loadRotationSchedule();
  }, [loadRotationSchedule]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadRotationSchedule();
  }, [loadRotationSchedule]);

  // Calculate statistics for selected week
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
        // Capitalize first letter and ensure proper format
        const day = task.dayOfWeek.charAt(0).toUpperCase() + task.dayOfWeek.slice(1).toLowerCase();
        if (distribution[day] !== undefined) {
          distribution[day]++;
        }
      }
    });
    
    return distribution;
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
    if (values.length === 0) return 100; // All tasks unassigned = perfect fairness
    
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
    selectedWeekData,
    setSelectedWeek,
    loadRotationSchedule,
    rotateTasks,
    refresh,
    getSelectedWeekTasks,
    getTaskDistributionByDay,
    calculateFairnessScore,
    isEmpty: weeks.length === 0,
    hasSchedule: weeks.some(week => week.tasks.length > 0),
  };
};

export type { ScheduleItem, WeekSchedule };