// components/GroupListener.tsx
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRealtimeAssignments } from '../hooks/useRealtimeAssignments';
import { useRealtimeSwapRequests } from '../hooks/useRealtimeSwapRequests';

interface GroupListenerProps {
  group: any;
  currentUserId: string | null;
  onRotation: (groupId: string, alert: any) => void;
  onTaskChange: () => void;
  onAssignmentChange: () => void;
  onSwapChange: () => void;
}

export const GroupListener = ({ 
  group, 
  currentUserId, 
  onRotation,
  onTaskChange,
  onAssignmentChange,
  onSwapChange 
}: GroupListenerProps) => {
  
  // ✅ Hooks called at top level, not in loop
  const { events: taskEvents, clearRotationCompleted } = useRealtimeTasks(group.id);
  const { events: assignmentEvents } = useRealtimeAssignments(group.id, currentUserId || '');
  const { events: swapEvents } = useRealtimeSwapRequests(group.id, currentUserId || '');

  // Handle rotation completed
  useEffect(() => {
    if (taskEvents.rotationCompleted) {
      console.log(`🔄 Rotation completed for group ${group.name}`, taskEvents.rotationCompleted);
      
      const myNewTasks = taskEvents.rotationCompleted.rotatedTasks?.filter(
        (task: any) => task.newAssignee === currentUserId
      ) || [];
      
      onRotation(group.id, {
        ...taskEvents.rotationCompleted,
        groupName: group.name,
        myTaskCount: myNewTasks.length
      });
      
      onTaskChange();
    }
  }, [taskEvents.rotationCompleted]);

  // Handle task events
  useEffect(() => {
    if (taskEvents.taskCreated || taskEvents.taskUpdated || 
        taskEvents.taskDeleted || taskEvents.taskAssigned) {
      onTaskChange();
    }
  }, [taskEvents.taskCreated, taskEvents.taskUpdated, 
      taskEvents.taskDeleted, taskEvents.taskAssigned]);

  // Handle assignment events
  useEffect(() => {
    if (assignmentEvents.assignmentCompleted || 
        assignmentEvents.assignmentVerified || 
        assignmentEvents.assignmentPendingVerification) {
      onAssignmentChange();
    }
  }, [assignmentEvents.assignmentCompleted, 
      assignmentEvents.assignmentVerified, 
      assignmentEvents.assignmentPendingVerification]);

  // Handle swap events
  useEffect(() => {
    if (swapEvents.swapCreated || swapEvents.swapResponded) {
      onSwapChange();
    }
  }, [swapEvents.swapCreated, swapEvents.swapResponded]);

  return null; // This component doesn't render anything
};