import React from 'react';

import {createStackNavigator} from'@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import MyGroupsScreen from '../screens/myGroupScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

export default function AppNavigator(){
        
    return(
           <Stack.Navigator initialRouteName="Login">
             <Stack.Screen
               name="Login"
               component = {LoginScreen}
               options={{headerShown:false}}
             />
             <Stack.Screen
               name="Signup"
               component={SignupScreen}
               options={{headerShown:false}}
             />
           
             {/* Main App Screens */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ 

            headerShown: false
          }}
        />
        
        <Stack.Screen 
          name="MyGroups" 
          component={MyGroupsScreen}
          options={{headerShown:false}}
        />
        
        <Stack.Screen 
          name="CreateGroup" 
          component={CreateGroupScreen}
          options={{ title: 'Create Group', headerShown:false }}
        />
        
        <Stack.Screen 
          name="JoinGroup" 
          component={JoinGroupScreen}
          options={{ headerShown:false }}
        />
        
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />

           </Stack.Navigator>


    )




}