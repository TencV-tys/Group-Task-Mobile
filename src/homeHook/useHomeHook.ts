// homeHook/useHomeData.ts - UPDATED WITH SECURESTORE
import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeService, HomeData } from '../services/HomeService';
import * as SecureStore from 'expo-secure-store';

export function useHomeData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 useHomeData: No auth token available in SecureStore');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      console.log('✅ useHomeData: Auth token found in SecureStore');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ useHomeData: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

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
  setHomeData(processedData);
  
  // Add this debug log
  console.log("📊 Home Data Stats:", {
    tasksDueThisWeek: processedData.stats.tasksDueThisWeek,
    overdueTasks: processedData.stats.overdueTasks,
    groupsCount: processedData.stats.groupsCount,
    swapRequests: processedData.stats.swapRequests
  });
  
  setError(null);
  setAuthError(false); 
  initialLoadDone.current = true;
  console.log("✅ useHomeData: Home data loaded successfully");
}else {
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

  const refreshHomeData = useCallback(() => {
    fetchHomeData(true);
  }, [fetchHomeData]);

  // Just load once on mount - NO POLLING
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