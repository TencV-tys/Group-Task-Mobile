import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import MyGroupScreen from '../screens/myGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupTasksScreen from '../screens/GroupTasksScreen'; 
import CreateTaskScreen from '../screens/CreateTaskScreen'; 
import UpdateTaskScreen from '../screens/UpdateTaskScreen';
import GroupMembersScreen from '../screens/GroupMembersScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import TaskAssignmentScreen from '../screens/TaskAssignmentScreen';
import RotationScheduleScreen from '../screens/RotationScheduleScreen';
import AssignmentDetailsScreen from '../screens/AssignmentDetailsScreen';
import CompleteAssignmentScreen from '../screens/CompleteAssignmentScreen';
import PendingVerificationsScreen from '../screens/PendingVerificationScreen';

// Import Swap Request Screens
import { PendingSwapRequestsScreen } from '../screens/PendingSwapRequestsScreen';
import { MySwapRequestsScreen } from '../screens/MySwapRequestScreen';
import { CreateSwapRequestScreen } from '../screens/CreateSwapRequestScreen';
import { SwapRequestDetailsScreen } from '../screens/SwapRequestDetailsScreen';
import { DetailedStatisticsScreen } from '../screens/DetailedStatisticsScreen';
import { FullLeaderboardScreen } from '../screens/FullLeaderboardScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      {/* Auth Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ headerShown: false }}
      />
      
      {/* Main App Screens */}
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="MyGroups" 
        component={MyGroupScreen}
        options={{ headerShown: false }}
      />
      
      {/* Group Management */}
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="JoinGroup" 
        component={JoinGroupScreen}
        options={{ headerShown: false }}
      />
      
      {/* Task Management */}
      <Stack.Screen 
        name="GroupTasks" 
        component={GroupTasksScreen}
        options={{ 
          headerShown: false,
          title: 'Group Tasks'
        }}
      />
      
      <Stack.Screen 
        name="CreateTask" 
        component={CreateTaskScreen}
        options={{ 
          headerShown: false,
          title: 'Create Task'
        }}
      />
      
      <Stack.Screen 
        name="UpdateTask" 
        component={UpdateTaskScreen}
        options={{ 
          headerShown: false,
          title: 'Edit Task'
        }}
      />
      
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          headerShown: false
        }}
      /> 
       
      <Stack.Screen 
        name="GroupMembers" 
        component={GroupMembersScreen}
        options={{ 
          headerShown: false,
          title: 'Group Members'
        }}
      />
      
      <Stack.Screen 
        name="TaskDetails" 
        component={TaskDetailsScreen}
        options={{ headerShown: false }}
      /> 

      <Stack.Screen 
        name="TaskAssignment" 
        component={TaskAssignmentScreen}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="RotationSchedule" 
        component={RotationScheduleScreen}
        options={{ 
          headerShown: false,
          title: 'Rotation Schedule'
        }}
      />
      
      <Stack.Screen 
        name="CompleteAssignment" 
        component={CompleteAssignmentScreen} 
        options={{ 
          headerShown: false
        }}
      />
      
      <Stack.Screen 
        name="AssignmentDetails" 
        component={AssignmentDetailsScreen} 
        options={{ 
          headerShown: false
        }}
      />
      
      <Stack.Screen 
        name="PendingVerifications" 
        component={PendingVerificationsScreen} 
        options={{ headerShown: false }}
      />

      {/* ============= SWAP REQUEST SCREENS ============= */}
      
      {/* Pending swap requests that need user's response */}
      <Stack.Screen
        name="PendingSwapRequests"
        component={PendingSwapRequestsScreen}
        options={{ 
          headerShown: false,
          title: 'Swap Requests'
        }}
      />
      
      {/* User's own swap requests history */}
      <Stack.Screen
        name="MySwapRequests"
        component={MySwapRequestsScreen}
        options={{ 
          headerShown: false,
          title: 'My Swap Requests'
        }}
      />
      
      {/* Create a new swap request */}
      <Stack.Screen
        name="CreateSwapRequest"
        component={CreateSwapRequestScreen}
        options={{ 
          headerShown: false,
          title: 'Request Swap'
        }}
      />
      
      {/* View swap request details */}
      <Stack.Screen
        name="SwapRequestDetails"
        component={SwapRequestDetailsScreen}
        options={{ 
          headerShown: false,
          title: 'Swap Request Details'
        }}
      />
      <Stack.Screen 
  name="DetailedStatistics" 
  component={DetailedStatisticsScreen}
  options={{ headerShown: false }}
/>

<Stack.Screen 
  name="FullLeaderboard" 
  component={FullLeaderboardScreen}
  options={{ headerShown: false }}
/>
      
    </Stack.Navigator>
  );
}