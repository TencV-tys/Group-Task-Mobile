import { useState, useEffect, useCallback } from 'react';
import { SwapRequest,SwapRequestFilters,SwapRequestService } from '../SwapRequestServices.ts/SwapRequestService';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSwapRequests = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<SwapRequest[]>([]);
  const [pendingForMe, setPendingForMe] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMyRequests, setTotalMyRequests] = useState(0);
  const [totalPendingForMe, setTotalPendingForMe] = useState(0);

  // Load user ID from storage on mount
  useEffect(() => {
    const loadUserId = async () => {
      try {
        // Try to get user from AsyncStorage - adjust key based on your storage
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id);
        } else {
          // Try alternative keys
          const token = await AsyncStorage.getItem('userToken');
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const user = JSON.parse(userData);
            setUserId(user.id);
          }
        }
      } catch (error) {
        console.error('Error loading user ID:', error);
      }
    };
    
    loadUserId();
  }, []);

  // Load my swap requests
  const loadMyRequests = useCallback(async (filters?: SwapRequestFilters) => {
    if (!userId) {
      console.log('No user ID available, skipping loadMyRequests');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SwapRequestService.getMySwapRequests(filters);
      
      if (response.success) {
        setMyRequests(response.data?.requests || []);
        setTotalMyRequests(response.data?.total || 0);
      } else {
        setError(response.message || 'Failed to load swap requests');
      }
    } catch (err: any) {
      console.error('Error loading my requests:', err);
      setError(err.message || 'Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load pending requests for current user
  const loadPendingForMe = useCallback(async (groupId?: string) => {
    if (!userId) {
      console.log('No user ID available, skipping loadPendingForMe');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SwapRequestService.getPendingForMe({ groupId });
      
      if (response.success) {
        setPendingForMe(response.data?.requests || []);
        setTotalPendingForMe(response.data?.total || 0);
      } else {
        setError(response.message || 'Failed to load pending requests');
      }
    } catch (err: any) {
      console.error('Error loading pending for me:', err);
      setError(err.message || 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Create swap request
  const createSwapRequest = useCallback(async (data: {
    assignmentId: string;
    reason?: string;
    targetUserId?: string;
    expiresAt?: string;
  }) => {
    if (!userId) {
      return { success: false, message: 'User not authenticated' };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First check if swap is allowed
      const checkResult = await SwapRequestService.checkCanSwap(data.assignmentId);
      
      if (!checkResult.success) {
        return { 
          success: false, 
          message: checkResult.message || 'Cannot request swap for this assignment' 
        };
      }
      
      if (checkResult.canSwap === false) {
        return { 
          success: false, 
          message: checkResult.reason || 'Cannot request swap for this assignment' 
        };
      }
      
      const response = await SwapRequestService.createSwapRequest(data);
      
      if (response.success) {
        // Refresh both lists
        await loadMyRequests();
        await loadPendingForMe();
      }
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to create swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, loadMyRequests, loadPendingForMe]);

  // Accept swap request
  const acceptSwapRequest = useCallback(async (requestId: string) => {
    if (!userId) {
      return { success: false, message: 'User not authenticated' };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SwapRequestService.acceptSwapRequest(requestId);
      
      if (response.success) {
        // Refresh both lists
        await loadMyRequests();
        await loadPendingForMe();
        
        Alert.alert(
          'Success',
          'Swap request accepted successfully! The assignment has been transferred to you.',
          [{ text: 'OK' }]
        );
      }
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to accept swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, loadMyRequests, loadPendingForMe]);

  // Reject swap request
  const rejectSwapRequest = useCallback(async (requestId: string, reason?: string) => {
    if (!userId) {
      return { success: false, message: 'User not authenticated' };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SwapRequestService.rejectSwapRequest(requestId, reason);
      
      if (response.success) {
        // Refresh both lists
        await loadMyRequests();
        await loadPendingForMe();
        
        Alert.alert(
          'Success',
          'Swap request rejected successfully.',
          [{ text: 'OK' }]
        );
      }
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to reject swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, loadMyRequests, loadPendingForMe]);

  // Cancel swap request
  const cancelSwapRequest = useCallback(async (requestId: string) => {
    if (!userId) {
      return { success: false, message: 'User not authenticated' };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await SwapRequestService.cancelSwapRequest(requestId);
      
      if (response.success) {
        // Refresh both lists
        await loadMyRequests();
        await loadPendingForMe();
        
        Alert.alert(
          'Success',
          'Swap request cancelled successfully.',
          [{ text: 'OK' }]
        );
      }
      
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [userId, loadMyRequests, loadPendingForMe]);

  // Check if user has pending requests for an assignment
  const hasPendingRequest = useCallback((assignmentId: string) => {
    return myRequests.some(
      request => request.assignmentId === assignmentId && request.status === 'PENDING'
    );
  }, [myRequests]);

  // Get pending request for an assignment
  const getPendingRequestForAssignment = useCallback((assignmentId: string) => {
    return myRequests.find(
      request => request.assignmentId === assignmentId && request.status === 'PENDING'
    );
  }, [myRequests]);

  // Refresh all data
  const refreshAll = useCallback(async (groupId?: string) => {
    await Promise.all([
      loadMyRequests(),
      loadPendingForMe(groupId)
    ]);
  }, [loadMyRequests, loadPendingForMe]);

  return {
    myRequests,
    pendingForMe,
    loading,
    error,
    totalMyRequests,
    totalPendingForMe,
    userId,
    loadMyRequests,
    loadPendingForMe,
    createSwapRequest,
    acceptSwapRequest,
    rejectSwapRequest,
    cancelSwapRequest,
    hasPendingRequest,
    getPendingRequestForAssignment,
    refreshAll,
  };
};