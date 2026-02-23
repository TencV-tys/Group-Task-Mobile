// homeHook/useHomeData.ts - UPDATED WITH TOKEN CHECK
import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeService, HomeData } from '../services/HomeService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useHomeData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('useHomeData: No auth token available');
        setAuthError(true);
        setError('Please log in again');
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('useHomeData: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);
 
  // Process data helper
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

  // Handle data update from polling
  const handleDataUpdate = useCallback((data: HomeData) => {
    if (isMounted.current) {
      const processedData = processData(data);
      setHomeData(processedData);
      setError(null);
      setAuthError(false);
    }
  }, [processData]);

  // Initial data fetch
  const fetchHomeData = useCallback(async (isRefreshing = false) => {
    // Check token first
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
      console.log("useHomeData: Fetching home data...");
      const result = await HomeService.getHomeData();
      
      if (result.success && result.data) {
        const processedData = processData(result.data);
        setHomeData(processedData);
        setError(null);
        setAuthError(false);
        initialLoadDone.current = true;
      } else {
        const errorMessage = result.message || 'Failed to load home data';
        console.error("useHomeData: API error:", errorMessage);
        setError(errorMessage);
        
        // Check if error is auth-related
        if (errorMessage.toLowerCase().includes('token') || 
            errorMessage.toLowerCase().includes('auth') ||
            errorMessage.toLowerCase().includes('unauthorized')) {
          setAuthError(true);
        }
      }
      
    } catch (err: any) {
      console.error("useHomeData: Network error:", err);
      setError(err.message || 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processData, checkToken]);

  const refreshHomeData = useCallback(() => {
    fetchHomeData(true);
  }, [fetchHomeData]);

  // Start polling AFTER initial load
  useEffect(() => {
    // Check token before starting
    checkToken().then(hasToken => {
      if (hasToken) {
        // Do initial fetch
        fetchHomeData();

        // Start polling only after component mounts
        const startPolling = () => {
          HomeService.startPolling(handleDataUpdate);
        };

        // Small delay to ensure initial load is done
        const timer = setTimeout(startPolling, 1000);

        return () => {
          clearTimeout(timer);
          isMounted.current = false;
          HomeService.stopPolling(handleDataUpdate);
        };
      }
    });
  }, [fetchHomeData, handleDataUpdate, checkToken]);

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