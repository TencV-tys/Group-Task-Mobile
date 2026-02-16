import { useState, useEffect, useCallback } from 'react';
import { TaskService } from '../services/TaskService';
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
  const [error, setError] = useState<string | null>(null);

  // Generate week labels
  const generateWeekLabel = useCallback((weekNum: number, currentWeekNum: number): string => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + (weekNum - currentWeekNum) * 7);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return `Week ${weekNum} (${formatDate(startDate)} - ${formatDate(endDate)})`;
  }, []);

  // Transform schedule data from API
  const transformScheduleData = useCallback((scheduleData: any, currentWeekNum: number): WeekSchedule[] => {
    const weeksMap: { [week: number]: WeekSchedule } = {};
    
    if (Array.isArray(scheduleData)) {
      scheduleData.forEach((weekData: any) => {
        const weekNum = weekData.week || 1;
        
        // Only include past and current weeks
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
            const scheduleItem: ScheduleItem = {
              taskId: task.taskId || task.id,
              taskTitle: task.taskTitle || task.title || 'Unnamed Task',
              assigneeName: task.assignee?.name || task.assignee?.fullName || 'Unassigned',
              week: weekNum,
              dayOfWeek: task.selectedDays?.[0] || task.dayOfWeek,
              scheduledTime: task.timeSlots?.[0]?.startTime,
              points: task.points || 0,
              category: task.category,
              status: 'pending'
            };
            
            weeksMap[weekNum].tasks.push(scheduleItem);
            weeksMap[weekNum].totalPoints += scheduleItem.points;
            weeksMap[weekNum].assignedTasksCount++;
          });
        }
      });
    }
    
    // Create weeks for past weeks (up to initialWeeks in the past)
    // Only show current week and past weeks
    const weeksToShow = Math.min(initialWeeks, currentWeekNum);
    for (let i = 0; i < weeksToShow; i++) {
      const weekNum = currentWeekNum - i; // Go backwards from current week
      if (weekNum > 0 && !weeksMap[weekNum]) {
        weeksMap[weekNum] = {
          weekNumber: weekNum,
          weekLabel: generateWeekLabel(weekNum, currentWeekNum),
          tasks: [],
          totalPoints: 0,
          assignedTasksCount: 0
        };
      }
    }
    
    return Object.values(weeksMap)
      .sort((a, b) => b.weekNumber - a.weekNumber) // Sort descending: newest first
      .map(week => ({
        ...week,
        weekLabel: generateWeekLabel(week.weekNumber, currentWeekNum)
      }));
  }, [initialWeeks, generateWeekLabel]);

  // Load rotation schedule
  const loadRotationSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await TaskService.getRotationSchedule(groupId, initialWeeks);
      
      if (result.success) {
        const currentWeekNum = result.currentWeek || 1;
        let transformedWeeks: WeekSchedule[] = [];
        
        if (result.schedule && Array.isArray(result.schedule)) {
          transformedWeeks = transformScheduleData(result.schedule, currentWeekNum);
        } else {
          // Create empty weeks for past weeks only
          const weeksToShow = Math.min(initialWeeks, currentWeekNum);
          for (let i = 0; i < weeksToShow; i++) {
            const weekNum = currentWeekNum - i;
            if (weekNum > 0) {
              transformedWeeks.push({
                weekNumber: weekNum,
                weekLabel: generateWeekLabel(weekNum, currentWeekNum),
                tasks: [],
                totalPoints: 0,
                assignedTasksCount: 0
              });
            }
          }
          // Sort newest first
          transformedWeeks.sort((a, b) => b.weekNumber - a.weekNumber);
        }
        
        setWeeks(transformedWeeks);
        setCurrentWeek(currentWeekNum);
        
        // Set selected week to current week if available
        if (transformedWeeks.length > 0) {
          const currentWeekExists = transformedWeeks.find(w => w.weekNumber === currentWeekNum);
          setSelectedWeek(currentWeekExists ? currentWeekNum : transformedWeeks[0].weekNumber);
        }
        
      } else {
        setError(result.message || 'Failed to load rotation schedule');
      }
    } catch (error: any) {
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

  return {
    loading,
    refreshing,
    weeks,
    selectedWeek,
    currentWeek,
    error,
    selectedWeekData: weeks.find(w => w.weekNumber === selectedWeek) || null,
    setSelectedWeek,
    loadRotationSchedule,
    rotateTasks,
    refresh,
    getSelectedWeekTasks: useCallback(() => {
      if (!selectedWeek) return [];
      const weekData = weeks.find(w => w.weekNumber === selectedWeek);
      return weekData?.tasks || [];
    }, [weeks, selectedWeek]),
    getTaskDistributionByDay: useCallback(() => {
      const tasks = weeks.find(w => w.weekNumber === selectedWeek)?.tasks || [];
      const distribution: { [key: string]: number } = {
        'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 
        'Friday': 0, 'Saturday': 0, 'Sunday': 0
      };
      tasks.forEach(task => {
        if (task.dayOfWeek && distribution[task.dayOfWeek]) {
          distribution[task.dayOfWeek]++;
        }
      });
      return distribution;
    }, [weeks, selectedWeek]),
    calculateFairnessScore: useCallback(() => {
      const tasks = weeks.find(w => w.weekNumber === selectedWeek)?.tasks || [];
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
    }, [weeks, selectedWeek]),
    isEmpty: weeks.length === 0,
    hasSchedule: weeks.some(week => week.tasks.length > 0),
  };
};

export type { ScheduleItem, WeekSchedule };