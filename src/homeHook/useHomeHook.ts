import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeService, HomeData } from '../services/HomeService';

export function useHomeData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>(null);

  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

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
    }
  }, [processData]);

  // Initial data fetch
  const fetchHomeData = useCallback(async (isRefreshing = false) => {
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
        initialLoadDone.current = true;
      } else {
        const errorMessage = result.message || 'Failed to load home data';
        console.error("useHomeData: API error:", errorMessage);
        setError(errorMessage);
      }
      
    } catch (err: any) {
      console.error("useHomeData: Network error:", err);
      setError(err.message || 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processData]);

  const refreshHomeData = useCallback(() => {
    fetchHomeData(true);
  }, [fetchHomeData]);

  // Start polling AFTER initial load
  useEffect(() => {
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
  }, [fetchHomeData, handleDataUpdate]);

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
    fetchHomeData,
    refreshHomeData,
    updateHomeData
  };
}