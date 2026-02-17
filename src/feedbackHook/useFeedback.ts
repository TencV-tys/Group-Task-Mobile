import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { FeedbackService, Feedback, FeedbackStats } from '../services/FeedbackService';

export const useFeedback = (initialFilter?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null>(initialFilter || null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const isMounted = useRef(true);

  // Handle stats update from polling
  const handleStatsUpdate = useCallback((newStats: FeedbackStats) => {
    if (isMounted.current) {
      setStats(newStats);
    }
  }, []);

  // Start/stop polling
  useEffect(() => {
    // Start polling
    FeedbackService.startPolling(handleStatsUpdate);

    return () => {
      isMounted.current = false;
      FeedbackService.stopPolling(handleStatsUpdate);
    };
  }, [handleStatsUpdate]);

  // Submit feedback
  const submitFeedback = useCallback(async (data: { type: string; message: string; category?: string }) => {
    try {
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
  }, []);

  // Update feedback
const updateFeedback = useCallback(async (feedbackId: string, data: { type?: string; message?: string; category?: string | null }) => {
  try {
    setLoading(true);
    
    // Convert null to undefined for the service call
    const serviceData: { type?: string; message?: string; category?: string } = {};
    if (data.type !== undefined) serviceData.type = data.type;
    if (data.message !== undefined) serviceData.message = data.message;
    if (data.category !== undefined) serviceData.category = data.category === null ? undefined : data.category;
    
    const result = await FeedbackService.updateFeedback(feedbackId, serviceData);

    if (result.success) {
      // Update in list if present
      setFeedbackList(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, ...result.feedback } : f
      ));
      
      // Update selected if this is the one
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
}, []);

  // Load feedback list (with optional filter)
  const loadFeedback = useCallback(async (page: number = 1, filter?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | null) => {
    try {
      setLoading(true);
      
      const currentFilter = filter !== undefined ? filter : activeFilter;
      
      let result;
      if (currentFilter) {
        result = await FeedbackService.getFeedbackByStatus(currentFilter, page, pagination.limit);
      } else {
        result = await FeedbackService.getMyFeedback(page, pagination.limit);
      }

      if (result.success) {
        setFeedbackList(result.feedback);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Load feedback error:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, activeFilter]);

  // Load feedback details
  const loadFeedbackDetails = useCallback(async (feedbackId: string) => {
    try {
      setLoading(true);
      const result = await FeedbackService.getFeedbackDetails(feedbackId);

      if (result.success) {
        setSelectedFeedback(result.feedback);
        return result.feedback;
      }
      return null;
    } catch (error) {
      console.error('Load feedback details error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stats (manual refresh)
  const loadStats = useCallback(async () => {
    try {
      const result = await FeedbackService.getMyFeedbackStats();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  }, []);

  // Delete feedback
  const deleteFeedback = useCallback(async (feedbackId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await FeedbackService.deleteFeedback(feedbackId);

      if (result.success) {
        // Remove from list
        setFeedbackList(prev => prev.filter(f => f.id !== feedbackId));
        
        // Clear selected if this was the one
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
  }, []);

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