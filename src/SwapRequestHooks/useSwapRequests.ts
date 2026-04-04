// SwapRequestHooks/useSwapRequests.ts - FIXED VERSION

import { useState, useEffect, useCallback, useRef } from 'react';
import { SwapRequestFilters, SwapRequest, SwapRequestService } from '../services/SwapRequestService';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { AuthService } from '../services/AuthService';
import { TokenUtils } from '../utils/tokenUtils';

export const useSwapRequests = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<SwapRequest[]>([]);
  const [pendingForMe, setPendingForMe] = useState<SwapRequest[]>([]);
  const [pendingForAdmin, setPendingForAdmin] = useState<SwapRequest[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMyRequests, setTotalMyRequests] = useState(0);
  const [totalPendingForMe, setTotalPendingForMe] = useState(0);
  const [totalPendingForAdmin, setTotalPendingForAdmin] = useState(0);
  const [authError, setAuthError] = useState(false);

  // =========================
  // Anti-spam / anti-429 refs - FIXED
  // =========================
  const pendingForMeLoadingRef = useRef(false);
  const lastPendingForMeLoadRef = useRef(0);
  const lastPendingForMeFiltersRef = useRef<string>('');

  const myRequestsLoadingRef = useRef(false);
  const lastMyRequestsLoadRef = useRef(0);
  const lastMyRequestsFiltersRef = useRef<string>('');

  // =========================
  // Check token
  // =========================
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });

    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // =========================
  // Load user ID from SecureStore on mount
  // =========================
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const user = await TokenUtils.getUser();

        if (user) {
          setUserId(user.id);
        } else {
          const token = await AuthService.getAccessToken();

          if (token) {
            const userData = await AuthService.getCurrentUser();

            if (userData) {
              await SecureStore.setItemAsync('user', JSON.stringify(userData));
              setUserId(userData.id);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
      }
    };

    loadUserId();
  }, []);

  // =========================
  // Show auth error alert
  // =========================
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => setAuthError(false) }]
      );
    }
  }, [authError]);

  // =========================
  // Load my swap requests - FIXED DEBOUNCE
  // =========================
  const loadMyRequests = useCallback(async (filters?: SwapRequestFilters, force = false) => {
    const now = Date.now();
    const filterKey = JSON.stringify(filters || {});

    // Don't block if it's a different filter (e.g., switching from ACCEPTED to ALL)
    const isSameFilter = lastMyRequestsFiltersRef.current === filterKey;
    
    if (myRequestsLoadingRef.current) {
      console.log('⏸️ Skipping loadMyRequests: already loading');
      return;
    }

    // Only apply time restriction if it's the SAME filter
    if (!force && isSameFilter && now - lastMyRequestsLoadRef.current < 3000) {
      console.log('⏸️ Skipping loadMyRequests: same filter called too soon');
      return;
    }

    // Allow immediate reload if filter changed
    if (!isSameFilter) {
      console.log('🔄 Filter changed, allowing immediate reload');
    }

    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    if (!userId) {
      console.log('⏸️ Cannot load my requests: No user ID');
      return;
    }

    myRequestsLoadingRef.current = true;
    lastMyRequestsLoadRef.current = now;
    lastMyRequestsFiltersRef.current = filterKey;

    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('📥 Loading my requests with filters:', filters);

      const response = await SwapRequestService.getMySwapRequests(filters);

      if (response.success) {
        const requests = response.data?.requests || [];
        const total = response.data?.total || 0;

        console.log(`✅ Loaded ${requests.length} requests (total: ${total})`);
        setMyRequests(requests);
        setTotalMyRequests(total);
      } else {
        console.error('❌ Failed to load requests:', response.message);
        setError(response.message || 'Failed to load swap requests');

        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      console.error('❌ Error in loadMyRequests:', err);
      setError(err.message || 'Failed to load swap requests');
    } finally {
      myRequestsLoadingRef.current = false;
      setLoading(false);
    }
  }, [userId, checkToken]);

  // =========================
  // Load pending requests for current user - FIXED DEBOUNCE
  // =========================
  const loadPendingForMe = useCallback(async (groupId?: string, force = false) => {
    const now = Date.now();
    const filterKey = groupId || 'no-group';

    const isSameFilter = lastPendingForMeFiltersRef.current === filterKey;

    // Prevent duplicate requests while one is still loading
    if (pendingForMeLoadingRef.current) { 
      console.log('⏸️ Skipping loadPendingForMe: already loading');
      return;
    }

    // Only apply time restriction if it's the SAME filter
    if (!force && isSameFilter && now - lastPendingForMeLoadRef.current < 3000) {
      console.log('⏸️ Skipping loadPendingForMe: same filter called too soon');
      return;
    }

    // Allow immediate reload if filter changed
    if (!isSameFilter) {
      console.log('🔄 Group filter changed, allowing immediate reload');
    }

    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    if (!userId) {
      console.log('⏸️ Cannot load pending for me: No user ID');
      return;
    }

    pendingForMeLoadingRef.current = true;
    lastPendingForMeLoadRef.current = now;
    lastPendingForMeFiltersRef.current = filterKey;

    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('📥 Loading pending for me with groupId:', groupId);

      const response = await SwapRequestService.getPendingForMe({ groupId });

      if (response.success) {
        const requests = response.data?.requests || [];
        const total = response.data?.total || 0;

        console.log(`✅ Loaded ${requests.length} pending requests (total: ${total})`);
        setPendingForMe(requests);
        setTotalPendingForMe(total);
      } else {
        console.error('❌ Failed to load pending requests:', response.message);
        setError(response.message || 'Failed to load pending requests');

        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      console.error('❌ Error in loadPendingForMe:', err);
      setError(err.message || 'Failed to load pending requests');
    } finally {
      pendingForMeLoadingRef.current = false;
      setLoading(false);
    }
  }, [userId, checkToken]);

  // ... rest of the functions remain the same ...
  
  // Load pending for admin
  const loadPendingForAdmin = useCallback(async (groupId: string) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    setCurrentGroupId(groupId);
    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('📥 Loading pending for admin approval with groupId:', groupId);

      const response = await SwapRequestService.getPendingForAdminApproval(groupId);

      if (response.success) {
        const requests = response.requests || [];
        const total = response.total || 0;

        console.log(`✅ Loaded ${requests.length} pending admin approvals (total: ${total})`);
        setPendingForAdmin(requests);
        setTotalPendingForAdmin(total);
      } else {
        console.error('❌ Failed to load pending admin approvals:', response.message);
        setError(response.message || 'Failed to load pending admin approvals');

        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
      }
    } catch (err: any) {
      console.error('❌ Error in loadPendingForAdmin:', err);
      setError(err.message || 'Failed to load pending admin approvals');
    } finally {
      setLoading(false);
    }
  }, [checkToken]);

  // Admin approve swap request
  const adminApproveSwapRequest = useCallback(async (requestId: string, notes?: string) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }

    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('✅ Admin approving swap request:', requestId);
      const response = await SwapRequestService.adminApproveSwapRequest(requestId, notes);

      console.log('📦 Admin approve response:', response);

      if (response.success) {
        if (currentGroupId) {
          await loadPendingForAdmin(currentGroupId);
        }
        Alert.alert('Success', response.message || 'Swap request approved successfully!');
      } else {
        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
        Alert.alert('Error', response.message || 'Failed to approve swap request');
      }

      return response;
    } catch (err: any) {
      console.error('❌ Error in adminApproveSwapRequest:', err);
      setError(err.message || 'Failed to approve swap request');
      Alert.alert('Error', err.message || 'Failed to approve swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [checkToken, currentGroupId, loadPendingForAdmin]);

  // Admin reject swap request
  const adminRejectSwapRequest = useCallback(async (requestId: string, reason: string) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }

    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('❌ Admin rejecting swap request:', requestId, 'reason:', reason);
      const response = await SwapRequestService.adminRejectSwapRequest(requestId, reason);

      console.log('📦 Admin reject response:', response);

      if (response.success) {
        if (currentGroupId) {
          await loadPendingForAdmin(currentGroupId);
        }
        Alert.alert('Success', response.message || 'Swap request rejected successfully!');
      } else {
        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
        Alert.alert('Error', response.message || 'Failed to reject swap request');
      }

      return response;
    } catch (err: any) {
      console.error('❌ Error in adminRejectSwapRequest:', err);
      setError(err.message || 'Failed to reject swap request');
      Alert.alert('Error', err.message || 'Failed to reject swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [checkToken, currentGroupId, loadPendingForAdmin]);

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
    const hasToken = await checkToken();
    if (!hasToken) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }

    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('📝 Creating swap request with data:', data);

      const checkResult = await SwapRequestService.checkCanSwap(
        data.assignmentId,
        data.scope,
        data.selectedDay
      );

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

      console.log('📦 Create swap request response:', response);

      if (response.success) {
        await loadMyRequests(undefined, true);
        await loadPendingForMe(undefined, true);

        if (response.requiresAdminApproval === true) {
          Alert.alert(
            '⏳ Awaiting Admin Approval',
            'Your swap request has been submitted and is waiting for admin approval. You will be notified once it is reviewed.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', response.message || 'Swap request created successfully!');
        }
      } else {
        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
        Alert.alert('Error', response.message || 'Failed to create swap request');
      }

      return response;
    } catch (err: any) {
      console.error('❌ Error in createSwapRequest:', err);
      setError(err.message || 'Failed to create swap request');
      Alert.alert('Error', err.message || 'Failed to create swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadMyRequests, loadPendingForMe, checkToken]);

 // useSwapRequests.ts - fix acceptSwapRequest
const acceptSwapRequest = useCallback(async (requestId: string, onSuccess?: () => void) => {
  const hasToken = await checkToken();
  if (!hasToken) return { success: false, message: 'Authentication required', authError: true };

  setLoading(true);
  setError(null);
  setAuthError(false);

  try {
    console.log('✅ Accepting swap request:', requestId);
    const response = await SwapRequestService.acceptSwapRequest(requestId);

    if (response.success) {
      if (onSuccess) onSuccess();

      // ✅ Delay refresh to avoid 429 - socket events will already trigger some reloads
      setTimeout(async () => {
        await Promise.all([
          loadMyRequests(undefined, true),
          loadPendingForMe(undefined, true)
        ]);
      }, 1500);

      const scope = response.data?.scope || response.scope;
      const selectedDay = response.data?.selectedDay || response.selectedDay;
      const transferredCount = response.data?.transferredCount || response.transferredCount;

      let successMessage = response.message || 'Swap request accepted successfully!';
      if (scope === 'day') {
        successMessage = transferredCount && transferredCount > 1
          ? `Swap accepted! You've taken over ${transferredCount} assignments for ${selectedDay}.`
          : `Swap accepted! You've taken over ${selectedDay}'s assignment.`;
      } else if (scope === 'week') {
        successMessage = "Swap accepted! The entire week's assignment has been transferred to you.";
      }

      Alert.alert('Success', successMessage);
    } else {
      if (response.message?.toLowerCase().match(/token|auth|unauthorized/)) setAuthError(true);
      Alert.alert('Error', response.message || 'Failed to accept swap request');
    }

    return response;
  } catch (err: any) {
    console.error('❌ Error in acceptSwapRequest:', err);
    setError(err.message || 'Failed to accept swap request');
    Alert.alert('Error', err.message || 'Failed to accept swap request');
    return { success: false, message: err.message };
  } finally {
    setLoading(false);
  }
}, [loadMyRequests, loadPendingForMe, checkToken]);
  // Reject swap request
  const rejectSwapRequest = useCallback(async (requestId: string, reason?: string) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }

    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('❌ Rejecting swap request:', requestId, 'reason:', reason);
      const response = await SwapRequestService.rejectSwapRequest(requestId, reason);

      console.log('📦 Reject response:', response);

      if (response.success) {
        await loadMyRequests(undefined, true);
        await loadPendingForMe(undefined, true);
        Alert.alert('Success', response.message || 'Swap request rejected successfully.');
      } else {
        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
        Alert.alert('Error', response.message || 'Failed to reject swap request');
      }

      return response;
    } catch (err: any) {
      console.error('❌ Error in rejectSwapRequest:', err);
      setError(err.message || 'Failed to reject swap request');
      Alert.alert('Error', err.message || 'Failed to reject swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadMyRequests, loadPendingForMe, checkToken]);

  // Cancel swap request
  const cancelSwapRequest = useCallback(async (requestId: string) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }

    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      console.log('✖️ Cancelling swap request:', requestId);
      const response = await SwapRequestService.cancelSwapRequest(requestId);

      console.log('📦 Cancel response:', response);

      if (response.success) {
        await loadMyRequests(undefined, true);
        await loadPendingForMe(undefined, true);
        Alert.alert('Success', response.message || 'Swap request cancelled successfully.');
      } else {
        if (
          response.message?.toLowerCase().includes('token') ||
          response.message?.toLowerCase().includes('auth') ||
          response.message?.toLowerCase().includes('unauthorized')
        ) {
          setAuthError(true);
        }
        Alert.alert('Error', response.message || 'Failed to cancel swap request');
      }

      return response;
    } catch (err: any) {
      console.error('❌ Error in cancelSwapRequest:', err);
      setError(err.message || 'Failed to cancel swap request');
      Alert.alert('Error', err.message || 'Failed to cancel swap request');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadMyRequests, loadPendingForMe, checkToken]);

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
    const hasToken = await checkToken();
    if (!hasToken) {
      return;
    }

    console.log('🔄 Refreshing all swap data');

    await Promise.all([
      loadMyRequests(undefined, true),
      loadPendingForMe(groupId, true)
    ]);
  }, [loadMyRequests, loadPendingForMe, checkToken]);

  // Get admin approval status for a request
  const getAdminApprovalStatus = useCallback((swapRequest: SwapRequest) => {
    return SwapRequestService.getAdminApprovalStatus(swapRequest);
  }, []);

  return {
    myRequests,
    pendingForMe,
    pendingForAdmin,
    loading,
    error,
    totalMyRequests,
    totalPendingForMe,
    totalPendingForAdmin,
    userId,
    authError,
    loadMyRequests,
    loadPendingForMe,
    loadPendingForAdmin,
    createSwapRequest,
    acceptSwapRequest,
    rejectSwapRequest,
    cancelSwapRequest,
    adminApproveSwapRequest,
    adminRejectSwapRequest,
    hasPendingRequest,
    getPendingRequestForAssignment,
    getSwapDescription,
    getAdminApprovalStatus,
    refreshAll,
  };
};  