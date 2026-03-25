// homeHook/useHomeData.ts - FIXED to prevent infinite refresh loop
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
  const [dataVersion, setDataVersion] = useState(0);

  // ✅ Single debounce timer for all refreshes
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);
  
  // ✅ Track event sources to prevent duplicate triggers
  const lastEventTime = useRef(0);
  const pendingRefresh = useRef(false);

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

  // ===== ACTUAL FETCH FUNCTION =====
  const executeFetch = useCallback(async (isRefreshingParam = false) => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      console.log('⚠️ Refresh already in progress, skipping...');
      return;
    }

    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshingParam) {
      setRefreshing(true);
      isRefreshingRef.current = true;
    } else if (!initialLoadDone.current) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log("📥 useHomeData: Fetching home data...");
      const result = await HomeService.getHomeData();
      
      if (result.success && result.data) {
        const processedData = processData(result.data);
        
        const newHomeData = {
          ...processedData,
          _timestamp: Date.now()
        };
        
        setHomeData(newHomeData);
        setDataVersion(prev => prev + 1);
        
        if (processedData.groups) {
          const groupIds = processedData.groups.map((g: any) => g.id);
          setUserGroups([...groupIds]);
        }
        
        console.log("📊 Home Data Stats:", {
          groupsCount: processedData.stats.groupsCount,
          tasksDueThisWeek: processedData.stats.tasksDueThisWeek,
          overdueTasks: processedData.stats.overdueTasks,
          swapRequests: processedData.stats.swapRequests,
          version: dataVersion + 1
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
      isRefreshingRef.current = false;
      pendingRefresh.current = false;
    }
  }, [processData, checkToken, dataVersion]);

  // ===== DEBOUNCED REFRESH - SINGLE ENTRY POINT =====
  const scheduleRefresh = useCallback((immediate = false) => {
    // Clear any pending timer
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    
    // If immediate refresh requested
    if (immediate) {
      console.log('🔄 Immediate refresh triggered');
      executeFetch(true);
      return;
    }
    
    // Debounce: Wait 500ms before executing
    refreshTimer.current = setTimeout(() => {
      console.log('🔄 Debounced refresh executing');
      executeFetch(true);
      refreshTimer.current = null;
    }, 500);
  }, [executeFetch]);

  // ===== EVENT HANDLER - Single function for all real-time events =====
  const handleRealTimeEvent = useCallback((eventName: string) => {
    const now = Date.now();
    
    // Throttle: Ignore events that happen within 100ms of each other
    if (now - lastEventTime.current < 100) {
      console.log(`⏳ Throttling event: ${eventName}, skipping...`);
      return;
    }
    
    lastEventTime.current = now;
    console.log(`📢 Real-time event: ${eventName}, scheduling refresh...`);
    
    // Schedule a debounced refresh
    scheduleRefresh();
  }, [scheduleRefresh]);

  // ===== LISTEN FOR ALL REAL-TIME EVENTS =====
  useEffect(() => {
    if (groupEvents.groupCreated) {
      handleRealTimeEvent('groupCreated');
      clearGroupCreated();
    }
  }, [groupEvents.groupCreated, handleRealTimeEvent, clearGroupCreated]);

  useEffect(() => {
    if (taskEvents.taskCreated || 
        taskEvents.taskUpdated || 
        taskEvents.taskDeleted ||
        taskEvents.taskAssigned) {
      handleRealTimeEvent('taskEvent');
    }
  }, [
    taskEvents.taskCreated,
    taskEvents.taskUpdated, 
    taskEvents.taskDeleted,
    taskEvents.taskAssigned,
    handleRealTimeEvent
  ]);

  useEffect(() => {
    if (assignmentEvents.assignmentCompleted ||
        assignmentEvents.assignmentVerified ||
        assignmentEvents.assignmentPendingVerification) {
      handleRealTimeEvent('assignmentEvent');
    }
  }, [
    assignmentEvents.assignmentCompleted,
    assignmentEvents.assignmentVerified,
    assignmentEvents.assignmentPendingVerification,
    handleRealTimeEvent
  ]);

  useEffect(() => {
    if (swapEvents.swapCreated ||
        swapEvents.swapResponded) {
      handleRealTimeEvent('swapEvent');
    }
  }, [
    swapEvents.swapCreated,
    swapEvents.swapResponded,
    handleRealTimeEvent
  ]);

  // ===== NOTIFICATIONS =====
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      const relevantTypes = [
        'TASK_ASSIGNED',
        'SUBMISSION_VERIFIED',
        'SUBMISSION_REJECTED',
        'POINTS_EARNED',
        'SWAP_ACCEPTED',
        'SWAP_RESPONDED',
        'LATE_SUBMISSION',
        'POINT_DEDUCTION',
        'GROUP_CREATED'
      ];
      
      if (relevantTypes.includes(notification.type)) {
        handleRealTimeEvent(`notification:${notification.type}`);
      }
    },
    showAlerts: true
  });

  // ===== REFRESH FUNCTION FOR MANUAL REFRESH =====
  const refreshHomeData = useCallback(() => {
    console.log('🔄 Manual refresh requested');
    // Cancel any pending debounce and refresh immediately
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    executeFetch(true);
  }, [executeFetch]);

  // ===== INITIAL LOAD =====
  useEffect(() => {
    checkToken().then(hasToken => {
      if (hasToken && !initialLoadDone.current) {
        executeFetch();
      }
    });
    
    return () => {
      isMounted.current = false;
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, [executeFetch, checkToken]);

  const updateHomeData = useCallback((updates: any) => {
    setHomeData((prev: any) => ({
      ...prev,
      ...updates,
      _timestamp: Date.now()
    }));
    setDataVersion(prev => prev + 1);
  }, []);

  return {
    loading,
    refreshing, 
    error,
    homeData,
    authError,
    dataVersion,
    fetchHomeData: executeFetch,
    refreshHomeData,
    updateHomeData
  };
}