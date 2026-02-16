// src/hooks/useHomeData.ts
import { useState, useEffect, useCallback } from 'react';
import { HomeService } from '../services/HomeService'; // Fixed import path

export function useHomeData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>(null);

  const fetchHomeData = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      console.log("useHomeData: Fetching home data...");
      const result = await HomeService.getHomeData();
      
      console.log("useHomeData: Full result:", JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        // Extract all data from the backend response
        const data = {
          user: result.data.user || {
            fullName: 'User',
            email: '',
            avatarUrl: null,
            groupsCount: 0,
            pointsThisWeek: 0,
            totalPoints: 0
          },
          stats: result.data.stats || {
            groupsCount: 0,
            tasksDueThisWeek: 0,
            overdueTasks: 0, 
            completedTasks: 0,
            totalTasks: 0,
            swapRequests: 0,
            completionRate: 0,
            pointsThisWeek: 0
          },
          currentWeekTasks: result.data.currentWeekTasks || [],
          upcomingTasks: result.data.upcomingTasks || [],
          groups: result.data.groups || [],
          leaderboard: result.data.leaderboard || [],
          recentActivity: result.data.recentActivity || [],
          rotationInfo: result.data.rotationInfo || {}
        };
        
        console.log("useHomeData: Processed data:", data);
        setHomeData(data);
      } else {
        const errorMessage = result.message || 'Failed to load home data';
        console.error("useHomeData: API error:", errorMessage);
        setError(errorMessage);
        setHomeData(null);
      }
      
    } catch (err: any) {
      console.error("useHomeData: Network error:", err);
      setError(err.message || 'Network error. Please check your connection.');
      setHomeData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshHomeData = () => {
    fetchHomeData(true);
  };

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Helper function to update specific parts of data
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