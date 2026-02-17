import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';

export default function ResetPasswordScreen({ navigation, route }: any) {
  console.log("🔥 RESET PASSWORD SCREEN RENDERED");
  console.log("📦 Params:", JSON.stringify(route.params));
  
  useEffect(() => {
    console.log("🔥 USE EFFECT RAN"); 
  }, []);
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>✅ RESET PASSWORD SCREEN</Text>
      <Text>Token: {route.params?.token || 'none'}</Text>
      <Text>Email: {route.params?.email || 'none'}</Text>
      <Button title="Go to Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}