// src/hooks/useFeedback.ts - UPDATED WITH TOKEN CHECK
import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { FeedbackService, Feedback, FeedbackStats } from '../services/FeedbackService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('useFeedback: No auth token available');
        setAuthError(true);
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('useFeedback: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  // Handle stats update from polling
  const handleStatsUpdate = useCallback((newStats: FeedbackStats) => {
    if (isMounted.current) {
      setStats(newStats);
    }
  }, []);

  // Start/stop polling
  useEffect(() => {
    // Check token before starting polling
    checkToken().then(hasToken => {
      if (hasToken) {
        FeedbackService.startPolling(handleStatsUpdate);
      }
    });

    return () => {
      isMounted.current = false;
      FeedbackService.stopPolling(handleStatsUpdate);
    };
  }, [handleStatsUpdate, checkToken]);

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
        Alert.alert(
          'Thank You!',
          'Your feedback has been submitted successfully.',
          [{ text: 'OK' }]
        );
        return { success: true, feedback: result.feedback };
      } else {
        Alert.alert('Error', result.message || 'Failed to submit feedback');
        return { success: false };
      }
    } catch (error) {
      console.error('Submit feedback error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return { success: false };
    } finally {
      setSubmitting(false);
    }
  }, [checkToken]);

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

      if (result.success) {
        setFeedbackList(prev => prev.map(f => 
          f.id === feedbackId ? { ...f, ...result.feedback } : f
        ));
        
        setSelectedFeedback(prev => 
          prev?.id === feedbackId ? { ...prev, ...result.feedback } : prev
        );
        
        Alert.alert('Success', 'Feedback updated successfully');
        return { success: true, feedback: result.feedback };
      } else {
        Alert.alert('Error', result.message || 'Failed to update feedback');
        return { success: false };
      }
    } catch (error) {
      console.error('Update feedback error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [checkToken]);
// Load feedback list (with optional filter)
const loadFeedback = useCallback(async (page: number = 1, filter?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null) => {
  try {
    const hasToken = await checkToken();
    if (!hasToken) return;

    setLoading(true);
    
    const currentFilter = filter !== undefined ? filter : activeFilter;
    
    let result;
    if (currentFilter) {
      result = await FeedbackService.getFeedbackByStatus(currentFilter, page, pagination.limit);
    } else {
      result = await FeedbackService.getMyFeedback(page, pagination.limit);
    }

    if (result.success) {
      // ✅ FIX: Provide default empty array if undefined
      setFeedbackList(result.feedback || []);
      
      // ✅ FIX: Provide default pagination if undefined
      setPagination(result.pagination || {
        page: 1,
        limit: pagination.limit,
        total: 0,
        pages: 0
      });
    } else if (result.message?.toLowerCase().includes('token') || 
               result.message?.toLowerCase().includes('auth')) {
      setAuthError(true);
    }
  } catch (error) {
    console.error('Load feedback error:', error);
  } finally {
    setLoading(false);
  }
}, [pagination.limit, activeFilter, checkToken]);

// Load feedback details
// Load feedback details
const loadFeedbackDetails = useCallback(async (feedbackId: string) => {
  try {
    const hasToken = await checkToken();
    if (!hasToken) return null;

    setLoading(true);
    const result = await FeedbackService.getFeedbackDetails(feedbackId);

    if (result.success) {
      // ✅ FIX: Use feedbackItem for single item response
      setSelectedFeedback(result.feedbackItem || null);
      return result.feedbackItem;
    }
    return null;
  } catch (error) {
    console.error('Load feedback details error:', error);
    return null;
  } finally {
    setLoading(false);
  }
}, [checkToken]);
// Load stats (manual refresh)
const loadStats = useCallback(async () => {
  try {
    const hasToken = await checkToken();
    if (!hasToken) return;

    const result = await FeedbackService.getMyFeedbackStats();
    if (result.success) {
      // ✅ FIX: Provide null if undefined
      setStats(result.stats || null);
    }
  } catch (error) {
    console.error('Load stats error:', error);
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

      if (result.success) {
        setFeedbackList(prev => prev.filter(f => f.id !== feedbackId));
        setSelectedFeedback(prev => prev?.id === feedbackId ? null : prev);
        Alert.alert('Success', 'Feedback deleted successfully');
        return true;
      } else {
        Alert.alert('Error', result.message || 'Failed to delete feedback');
        return false;
      }
    } catch (error) {
      console.error('Delete feedback error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
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

  return {
    // State
    loading,
    submitting,
    feedbackList,
    selectedFeedback,
    stats,
    pagination,
    activeFilter,
    authError,

    // Functions
    submitFeedback,
    updateFeedback,
    loadFeedback,
    loadFeedbackDetails,
    loadStats,
    deleteFeedback,
    confirmDelete,
    clearSelected,
    setFilter
  };
};