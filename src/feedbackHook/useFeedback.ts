// src/hooks/useFeedback.ts - FIXED VERSION

import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { FeedbackService, Feedback, FeedbackStats } from '../services/FeedbackService';
import { TokenUtils } from '../utils/tokenUtils';

export const useFeedback = (initialFilter?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null>(initialFilter || null);
  const [authError, setAuthError] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20, 
    total: 0, 
    pages: 0
  });

  const isMounted = useRef(true);
  const currentFilterRef = useRef<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null>(initialFilter || null);
  const currentPageRef = useRef(1);
  const lastAlertTimeRef = useRef(0);
  const loadingRef = useRef(false); // ✅ Track loading state to prevent double calls

  // Check token
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return;

      const result = await FeedbackService.getMyFeedbackStats();
      if (result.success && isMounted.current) {
        setStats(result.stats || null);
        console.log('✅ useFeedback: Stats loaded');
      }
    } catch (error) {
      console.error('❌ Load stats error:', error);
    }
  }, [checkToken]);

  // Submit feedback
  const submitFeedback = useCallback(async (data: { type: string; message: string; category?: string }) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return { success: false, authError: true };
      }

      setSubmitting(true);
      const result = await FeedbackService.submitFeedback(data);

      if (result.success) {
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 2000) {
          lastAlertTimeRef.current = now;
          Alert.alert('✅ Success', 'Feedback submitted successfully!');
        }
        return { success: true, feedback: result.feedback };
      } else {
        Alert.alert('Error', result.message || 'Failed to submit feedback');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Submit feedback error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return { success: false };
    } finally {
      setSubmitting(false);
    }
  }, [checkToken]);

  // Load feedback list - ✅ FIXED dependencies
  const loadFeedback = useCallback(async (page: number = 1, filter?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null) => {
    // ✅ Prevent multiple simultaneous calls
    if (loadingRef.current) {
      console.log('⏳ Load already in progress, skipping');
      return;
    }
    
    try {
      const hasToken = await checkToken();
      if (!hasToken) return;

      loadingRef.current = true;
      setLoading(true);
      
      const currentFilter = filter !== undefined ? filter : activeFilter;
      currentFilterRef.current = currentFilter;
      currentPageRef.current = page;
      
      let result;
      if (currentFilter) {
        result = await FeedbackService.getFeedbackByStatus(currentFilter, page, 20);
      } else {
        result = await FeedbackService.getMyFeedback(page, 20);
      }

      if (result.success && isMounted.current) {
        setFeedbackList(result.feedback || []);
        setPagination(result.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        });
        console.log(`✅ useFeedback: Loaded ${result.feedback?.length || 0} feedback items`);
      } else if (result.message?.toLowerCase().includes('token') || 
                 result.message?.toLowerCase().includes('auth')) {
        setAuthError(true);
      }
    } catch (error) {
      console.error('❌ Load feedback error:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [activeFilter, checkToken]); // ✅ Removed pagination.limit dependency

  // Load feedback details
  const loadFeedbackDetails = useCallback(async (feedbackId: string) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) return null;

      setLoading(true);
      console.log(`📥 Loading feedback details for ID: ${feedbackId}`);
      
      const result = await FeedbackService.getFeedbackDetails(feedbackId);

      if (result.success && isMounted.current) {
        const feedbackData = result.feedbackItem || result.feedback || null;
        
        if (feedbackData) {
          const selectedItem = Array.isArray(feedbackData) ? feedbackData[0] : feedbackData;
          
          if (selectedItem) {
            setSelectedFeedback(selectedItem);
            console.log('✅ Feedback details loaded:', selectedItem.id);
            return selectedItem;
          } else {
            console.error('❌ No feedback data in response');
            Alert.alert('Error', 'Feedback data not found');
            return null;
          }
        } else {
          console.error('❌ No feedback data in response');
          Alert.alert('Error', 'Feedback data not found');
          return null;
        }
      } else {
        console.error('❌ Failed to load feedback:', result.message);
        Alert.alert('Error', result.message || 'Failed to load feedback details');
        return null;
      }
    } catch (error) {
      console.error('❌ Load feedback details error:', error);
      Alert.alert('Error', 'Failed to load feedback details');
      return null;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [checkToken]);

  // Delete feedback
  const deleteFeedback = useCallback(async (feedbackId: string): Promise<boolean> => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return false;
      }

      setLoading(true);
      const result = await FeedbackService.deleteFeedback(feedbackId);

      if (result.success && isMounted.current) {
        setFeedbackList(prev => prev.filter(f => f.id !== feedbackId));
        setSelectedFeedback(prev => prev?.id === feedbackId ? null : prev);
        
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 2000) {
          lastAlertTimeRef.current = now;
          Alert.alert('Success', 'Feedback deleted successfully');
        }
        return true;
      } else {
        Alert.alert('Error', result.message || 'Failed to delete feedback');
        return false;
      }
    } catch (error) {
      console.error('❌ Delete feedback error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return false;
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [checkToken]);

  // Confirm delete
  const confirmDelete = useCallback((feedbackId: string) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteFeedback(feedbackId)
        }
      ]
    );
  }, [deleteFeedback]);

  // Set filter and reload
  const setFilter = useCallback((filter: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null) => {
    setActiveFilter(filter);
    loadFeedback(1, filter);
  }, [loadFeedback]);

  // Clear selected
  const clearSelected = useCallback(() => {
    setSelectedFeedback(null);
  }, []);

  // Refresh current view
  const refreshCurrentView = useCallback(async () => {
    console.log('🔄 Refreshing current feedback view...');
    await loadFeedback(currentPageRef.current, currentFilterRef.current);
  }, [loadFeedback]);

  // Update feedback
  const updateFeedback = useCallback(async (feedbackId: string, data: { type?: string; message?: string; category?: string | null }) => {
    try {
      const hasToken = await checkToken();
      if (!hasToken) {
        Alert.alert('Authentication Error', 'Please log in again');
        return { success: false, authError: true };
      }

      setLoading(true);
      
      const serviceData: { type?: string; message?: string; category?: string } = {};
      if (data.type !== undefined) serviceData.type = data.type;
      if (data.message !== undefined) serviceData.message = data.message;
      if (data.category !== undefined) serviceData.category = data.category === null ? undefined : data.category;
      
      const result = await FeedbackService.updateFeedback(feedbackId, serviceData);

      if (result.success && isMounted.current) {
        setFeedbackList(prev => prev.map(f => 
          f.id === feedbackId ? { ...f, ...result.feedback } : f
        ));
        
        setSelectedFeedback(prev => 
          prev?.id === feedbackId ? { ...prev, ...result.feedback } : prev
        );
        
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 2000) {
          lastAlertTimeRef.current = now;
          Alert.alert('Success', 'Feedback updated successfully');
        }
        return { success: true, feedback: result.feedback };
      } else {
        Alert.alert('Error', result.message || 'Failed to update feedback');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Update feedback error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return { success: false };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [checkToken]);

  // Initial load - ✅ Run once
  useEffect(() => {
    loadFeedback(1);
    loadStats();
  }, []); // ✅ Empty deps - run once

  // Cleanup on unmount
  useEffect(() => { 
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshStats = useCallback(async () => {
    console.log('🔄 Refreshing feedback stats...');
    await loadStats();
  }, [loadStats]);

  return {
    loading,
    submitting,
    feedbackList,
    selectedFeedback,
    stats,
    pagination,
    activeFilter,
    authError,
    
    submitFeedback,
    updateFeedback, 
    loadFeedback,
    loadFeedbackDetails,
    loadStats,
    deleteFeedback,
    confirmDelete,
    clearSelected,
    setFilter,
    refreshCurrentView,
    refreshStats,
  };
};