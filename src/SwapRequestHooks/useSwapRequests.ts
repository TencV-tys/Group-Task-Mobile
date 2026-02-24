// SwapRequestHooks/useSwapRequests.ts - UPDATED WITH SECURESTORE
import { useState, useEffect, useCallback } from 'react';
import { SwapRequestFilters, SwapRequest, SwapRequestService } from '../services/SwapRequestService';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export const useSwapRequests = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<SwapRequest[]>([]);
  const [pendingForMe, setPendingForMe] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMyRequests, setTotalMyRequests] = useState(0);
  const [totalPendingForMe, setTotalPendingForMe] = useState(0);

  // Load user ID from SecureStore on mount
  useEffect(() => {
    const loadUserId = async () => {
      try {
        // Try to get userData from SecureStore first
        let userStr = await SecureStore.getItemAsync('userData');
        
        // If not found, try 'user' as fallback
        if (!userStr) {
          userStr = await SecureStore.getItemAsync('user');
        }
        
        // If still not found, try 'userId' directly
        if (!userStr) {
          const userId = await SecureStore.getItemAsync('userId');
          if (userId) {
            setUserId(userId);
            console.log('✅ User ID loaded directly from userId key:', userId);
            return;
          }
        }
        
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id || user._id); // Handle both id and _id formats
          console.log('✅ User ID loaded from SecureStore:', user.id || user._id);
          console.log('📦 User data loaded from SecureStore');
        } else {
          console.warn('⚠️ No user found in SecureStore');
          
          // Debug: Check if token exists
          const token = await SecureStore.getItemAsync('userToken');
          console.log('🔐 Token exists in SecureStore:', token ? 'Yes' : 'No');
        }
      } catch (error) {
        console.error('❌ Error loading user ID from SecureStore:', error);
      }
    };
    loadUserId();
  }, []);

  // Load my swap requests
  const loadMyRequests = useCallback(async (filters?: SwapRequestFilters) => {
    if (!userId) {
      console.log('⏸️ Cannot load my requests: No user ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📥 Loading my requests with filters:', filters);
      const response = await SwapRequestService.getMySwapRequests(filters);
      
      console.log('📦 Load my requests response:', response);
      
      if (response.success) {
        const requests = response.data?.requests || [];
        const total = response.data?.total || 0;
        
        console.log(`✅ Loaded ${requests.length} requests (total: ${total})`);
        
        setMyRequests(requests);
        setTotalMyRequests(total);
        
        // Log first request for debugging
        if (requests.length > 0) {
          console.log('📋 First request:', JSON.stringify(requests[0], null, 2));
        }
      } else {
        console.error('❌ Failed to load requests:', response.message);
        setError(response.message || 'Failed to load swap requests');
      }
    } catch (err: any) {
      console.error('❌ Error in loadMyRequests:', err);
      setError(err.message || 'Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  }, [userId]); 

  // Load pending requests for current user
  const loadPendingForMe = useCallback(async (groupId?: string) => {
    if (!userId) {
      console.log('⏸️ Cannot load pending for me: No user ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📥 Loading pending for me with groupId:', groupId);
      const response = await SwapRequestService.getPendingForMe({ groupId });
      
      console.log('📦 Load pending for me response:', response);
      
      if (response.success) {
        const requests = response.data?.requests || [];
        const total = response.data?.total || 0;
        
        console.log(`✅ Loaded ${requests.length} pending requests (total: ${total})`);
        
        setPendingForMe(requests);
        setTotalPendingForMe(total);
      } else {
        console.error('❌ Failed to load pending requests:', response.message);
        setError(response.message || 'Failed to load pending requests');
      }
    } catch (err: any) {
      console.error('❌ Error in loadPendingForMe:', err);
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
    scope?: 'week' | 'day';
    selectedDay?: string;
    selectedTimeSlotId?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📝 Creating swap request with data:', data);
      
      // Check if assignment can be swapped first
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
      
      // Create the swap request - service will add auth token from SecureStore
      const response = await SwapRequestService.createSwapRequest(data);
      
      console.log('📦 Create swap request response:', response);
      
      if (response.success) {
        await loadMyRequests();
        await loadPendingForMe();
      }
      
      return response;
    } catch (err: any) {
      console.error('❌ Error in createSwapRequest:', err);
      setError(err.message || 'Failed to create swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadMyRequests, loadPendingForMe]);

  // Accept swap request
  const acceptSwapRequest = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('✅ Accepting swap request:', requestId);
      const response = await SwapRequestService.acceptSwapRequest(requestId);
      
      console.log('📦 Accept response:', response);
      
      if (response.success) {
        await loadMyRequests();
        await loadPendingForMe();
        
        // Get swap details for better message
        const swapRequest = response.data?.swapRequest;
        const scope = response.data?.scope;
        const selectedDay = response.data?.selectedDay;
        const transferredCount = response.data?.transferredCount;
        
        let successMessage = 'Swap request accepted successfully!';
        if (scope === 'day') {
          if (transferredCount && transferredCount > 1) {
            successMessage = `Swap accepted! You've taken over ${transferredCount} assignments for ${selectedDay}.`;
          } else {
            successMessage = `Swap accepted! You've taken over ${selectedDay}'s assignment.`;
          }
        } else {
          successMessage = 'Swap accepted! The entire week\'s assignment has been transferred to you.';
        }
        
        Alert.alert('Success', successMessage);
      }
      
      return response;
    } catch (err: any) {
      console.error('❌ Error in acceptSwapRequest:', err);
      setError(err.message || 'Failed to accept swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadMyRequests, loadPendingForMe]);

  // Reject swap request
  const rejectSwapRequest = useCallback(async (requestId: string, reason?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('❌ Rejecting swap request:', requestId, 'reason:', reason);
      const response = await SwapRequestService.rejectSwapRequest(requestId, reason);
      
      console.log('📦 Reject response:', response);
      
      if (response.success) {
        await loadMyRequests();
        await loadPendingForMe();
        Alert.alert('Success', 'Swap request rejected successfully.');
      }
      
      return response;
    } catch (err: any) {
      console.error('❌ Error in rejectSwapRequest:', err);
      setError(err.message || 'Failed to reject swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadMyRequests, loadPendingForMe]);

  // Cancel swap request
  const cancelSwapRequest = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('✖️ Cancelling swap request:', requestId);
      const response = await SwapRequestService.cancelSwapRequest(requestId);
      
      console.log('📦 Cancel response:', response);
      
      if (response.success) {
        await loadMyRequests();
        await loadPendingForMe();
        Alert.alert('Success', 'Swap request cancelled successfully.');
      }
      
      return response;
    } catch (err: any) {
      console.error('❌ Error in cancelSwapRequest:', err);
      setError(err.message || 'Failed to cancel swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadMyRequests, loadPendingForMe]);

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

  // Get swap description
  const getSwapDescription = useCallback((swapRequest: SwapRequest) => {
    return SwapRequestService.getSwapDescription(swapRequest);
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async (groupId?: string) => {
    console.log('🔄 Refreshing all swap data');
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
    getSwapDescription,
    refreshAll,
  };
};