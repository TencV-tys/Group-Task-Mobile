// src/hooks/useHomeData.ts
import { useState, useEffect, useCallback } from 'react';
import { HomeService } from '../homeService/HomeService'; // Make sure path is correct

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
        // Extract data with proper fallbacks
        const data = {
          user: result.data.user || {
            fullName: 'User',
            email: '',
            avatarUrl: null,
            groupsCount: 0,
            tasksDue: 0,
            totalTasks: 0,
            completedTasks: 0
          },
          stats: result.data.stats || {
            groupsCount: 0,
            tasksDue: 0,
            completedTasks: 0,
            totalTasks: 0,
            completionRate: 0
          },
          recentActivity: result.data.recentActivity || [],
          groups: result.data.groups || []
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