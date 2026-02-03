import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import MyGroupScreen from '../screens/myGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupTasksScreen from '../screens/GroupTasksScreen'; // Add this import
import CreateTaskScreen from '../screens/CreateTaskScreen'; // Add this import
import UpdateTaskScreen from '../screens/UpdateTaskScreen';
import GroupMembersScreen from '../screens/GroupMembersScreen';

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
      
      {/* Task Management - ADD THESE */}
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
          headerShown: true,
          title: 'Profile',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
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
 

    </Stack.Navigator>
  );
}