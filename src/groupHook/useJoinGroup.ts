// src/hooks/useJoinGroup.ts
import { useState, useCallback } from 'react';
import { GroupService } from '../services/GroupService'; // Adjust path as needed

export function useJoinGroup() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [joinedGroup, setJoinedGroup] = useState<any>(null);

  const joinGroup = useCallback(async (inviteCode: string) => {
    // Reset states
    setLoading(true);
    setError(null);
    setSuccess(false);
    setJoinedGroup(null);

    try {
      console.log(`useJoinGroup: Attempting to join with code: ${inviteCode}`);
      
      // Validate input
      if (!inviteCode || !inviteCode.trim()) {
        throw new Error('Invite code is required');
      }

      const cleanInviteCode = inviteCode.trim().toUpperCase();
      
      // Check code format (6 characters)
      if (cleanInviteCode.length !== 6) {
        throw new Error('Invite code must be 6 characters');
      }

      // Call the service
      const result = await GroupService.joinGroup(cleanInviteCode);
      console.log('useJoinGroup: API result:', result);

      if (result.success) {
        setSuccess(true);
        setJoinedGroup(result.group || result);
        
        return {
          success: true,
          message: result.message || 'Successfully joined group!',
          group: result.group || result,
          membership: result.membership
        };
      } else {
        throw new Error(result.message || 'Failed to join group');
      }

    } catch (err: any) {
      console.error('useJoinGroup: Error:', err);
      
      let errorMessage = err.message || 'Failed to join group';
      
      // User-friendly error messages
      if (errorMessage.includes('Invalid invite code')) {
        errorMessage = 'Invalid invite code. Please check and try again.';
      } else if (errorMessage.includes('already a member')) {
        errorMessage = 'You are already a member of this group.';
      } else if (errorMessage.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        error: err.message
      };

    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setJoinedGroup(null);
  }, []);

  return {
    loading,
    error,
    success,
    joinedGroup,
    joinGroup,
    reset
  };
}