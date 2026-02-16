import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { FeedbackService, Feedback } from '../services/FeedbackService';

export const useFeedback = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

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

  // Load feedback list
  const loadFeedback = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      const result = await FeedbackService.getMyFeedback(page, pagination.limit);

      if (result.success) {
        setFeedbackList(result.feedback);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Load feedback error:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

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

  // Load stats
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

  // Delete feedback - RETURNS PROMISE<BOOLEAN>
  const deleteFeedback = useCallback(async (feedbackId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await FeedbackService.deleteFeedback(feedbackId);

      if (result.success) {
        // Remove from list
        setFeedbackList(prev => prev.filter(f => f.id !== feedbackId));
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

  // Confirm delete - FOR UI (doesn't return promise)
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

  return {
    // State
    loading,
    submitting,
    feedbackList,
    selectedFeedback,
    stats,
    pagination,

    // Functions
    submitFeedback,
    loadFeedback,
    loadFeedbackDetails,
    loadStats,
    deleteFeedback,      // Return the actual delete function that returns Promise<boolean>
    confirmDelete,       // Return the confirm function for UI alerts

    // Reset selected
    clearSelected: () => setSelectedFeedback(null)
  };
};