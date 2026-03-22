// homeHook/useHomeData.ts - FIXED to ensure re-renders
import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeService, HomeData } from '../services/HomeService';
import { TokenUtils } from '../utils/tokenUtils';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useRealtimeGroup } from '../hooks/useRealtimeGroup';

export function useHomeData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<string[]>([]);
 
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

  // ===== GET USER ID ON MOUNT =====
  useEffect(() => {
    const getUserData = async () => {
      const user = await TokenUtils.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUserData();
  }, []);

  // ===== REAL-TIME EVENT LISTENERS =====
  const { events: taskEvents } = useRealtimeTasks('');
  const { events: assignmentEvents } = useRealtimeAssignments('', currentUserId || '');
  const { events: swapEvents } = useRealtimeSwapRequests('', currentUserId || '');
  const { events: groupEvents, clearGroupCreated } = useRealtimeGroup('');

  // ===== CHECK TOKEN =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => {
        setAuthError(true);
        setError('Please log in again');
      }
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // ===== PROCESS DATA =====
  const processData = useCallback((data: HomeData) => {
    return {
      user: data.user || {
        fullName: 'User',
        email: '',
        avatarUrl: null,
        groupsCount: 0,
        pointsThisWeek: 0,
        totalPoints: 0
      },
      stats: data.stats || {
        groupsCount: 0,
        tasksDueThisWeek: 0,
        overdueTasks: 0, 
        completedTasks: 0,
        totalTasks: 0,
        swapRequests: 0,
        completionRate: 0,
        pointsThisWeek: 0
      },
      currentWeekTasks: data.currentWeekTasks || [],
      upcomingTasks: data.upcomingTasks || [],
      groups: data.groups || [],
      leaderboard: data.leaderboard || [],
      recentActivity: data.recentActivity || [],
      rotationInfo: data.rotationInfo || {}
    };
  }, []);

  // ===== FETCH HOME DATA =====
  const fetchHomeData = useCallback(async (isRefreshing = false) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) {
      setRefreshing(true); 
    } else if (!initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log("📥 useHomeData: Fetching home data...");
      const result = await HomeService.getHomeData();
      
      if (result.success && result.data) {
        const processedData = processData(result.data);
        
        // ✅ Force a new object reference to trigger re-render
        setHomeData({ ...processedData });
        
        if (processedData.groups) {
          const groupIds = processedData.groups.map((g: any) => g.id);
          setUserGroups([...groupIds]); // Force new array reference
        }
        
        console.log("📊 Home Data Stats:", {
          groupsCount: processedData.stats.groupsCount,
          tasksDueThisWeek: processedData.stats.tasksDueThisWeek,
          overdueTasks: processedData.stats.overdueTasks,
          swapRequests: processedData.stats.swapRequests
        });
        
        setError(null);
        setAuthError(false); 
        initialLoadDone.current = true;
        console.log("✅ useHomeData: Home data loaded successfully");
      } else {
        const errorMessage = result.message || 'Failed to load home data';
        console.error("❌ useHomeData: API error:", errorMessage);
        setError(errorMessage);
      }
      
    } catch (err: any) {
      console.error("❌ useHomeData: Network error:", err);
      setError(err.message || 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processData, checkToken]);

  // ===== REFRESH FUNCTION =====
  const refreshHomeData = useCallback(() => {
    console.log('🔄 refreshHomeData called');
    fetchHomeData(true);
  }, [fetchHomeData]);

  // ===== LISTEN FOR GROUP CREATION =====
  useEffect(() => {
    if (groupEvents.groupCreated) {
      console.log('🆕 Group created detected in useHomeData, refreshing...');
      console.log('   New group:', groupEvents.groupCreated.groupName);
      refreshHomeData();
      clearGroupCreated();
    }
  }, [groupEvents.groupCreated, refreshHomeData, clearGroupCreated]);

  // ===== TASK EVENTS =====
  useEffect(() => {
    if (taskEvents.taskCreated || 
        taskEvents.taskUpdated || 
        taskEvents.taskDeleted ||
        taskEvents.taskAssigned) {
      console.log('🔄 Task event detected, refreshing home data...');
      refreshHomeData();
    }
  }, [
    taskEvents.taskCreated,
    taskEvents.taskUpdated, 
    taskEvents.taskDeleted,
    taskEvents.taskAssigned,
    refreshHomeData
  ]);

  // ===== ASSIGNMENT EVENTS =====
  useEffect(() => {
    if (assignmentEvents.assignmentCompleted ||
        assignmentEvents.assignmentVerified ||
        assignmentEvents.assignmentPendingVerification) {
      console.log('✅ Assignment event detected, refreshing home data...');
      refreshHomeData();
    }
  }, [
    assignmentEvents.assignmentCompleted,
    assignmentEvents.assignmentVerified,
    assignmentEvents.assignmentPendingVerification,
    refreshHomeData
  ]);

  // ===== SWAP EVENTS =====
  useEffect(() => {
    if (swapEvents.swapCreated ||
        swapEvents.swapResponded) {
      console.log('🔄 Swap event detected, refreshing home data...');
      refreshHomeData();
    }
  }, [
    swapEvents.swapCreated,
    swapEvents.swapResponded,
    refreshHomeData
  ]);

  // ===== NOTIFICATIONS =====
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if ([
        'TASK_ASSIGNED',
        'SUBMISSION_VERIFIED',
        'SUBMISSION_REJECTED',
        'POINTS_EARNED',
        'SWAP_ACCEPTED',
        'SWAP_RESPONDED',
        'LATE_SUBMISSION',
        'POINT_DEDUCTION'
      ].includes(notification.type)) {
        console.log(`🔔 Notification ${notification.type} received, refreshing home data...`);
        refreshHomeData();
      }
    },
    showAlerts: true
  });

  // ===== INITIAL LOAD =====
  useEffect(() => {
    checkToken().then(hasToken => {
      if (hasToken) {
        fetchHomeData();
      }
    });
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchHomeData, checkToken]);

  const updateHomeData = useCallback((updates: any) => {
    setHomeData((prev: any) => ({
      ...prev,
      ...updates
    }));
  }, []);

  return {
    loading,
    refreshing, 
    error,
    homeData,
    authError,
    fetchHomeData,
    refreshHomeData,
    updateHomeData
  };
}