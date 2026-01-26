import React from 'react';

import {createStackNavigator} from'@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';


const Stack = createStackNavigator();

export default function AppNavigator(){
        
    return(
           <Stack.Navigator initialRouteName="Login">
             <Stack.Screen
               name="Login"
               component = {LoginScreen}
               options={{title:"Login"}}
             />
             <Stack.Screen
               name="Signup"
               component={SignupScreen}
               options={{title:"Signup"}}
             />
           
           </Stack.Navigator>


    )




}