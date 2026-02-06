// src/screens/ProfileScreen.tsx - UPDATED FOR CONSISTENCY
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../authServices/AuthService';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = async () => {
    try {
      const userData = await AuthService.getCurrentUser();
      console.log('Loaded user data:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout
        }
      ]
    );
  };

  const performLogout = async () => {
    try {
      const result = await AuthService.logout();
      
      if (result.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert('Error', result.message || 'Logout failed');
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const handleAccountSettings = () => {
    navigation.navigate('AccountSettings');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const handlePrivacyPolicy = () => {
    navigation.navigate('PrivacyPolicy');
  };

  const handleTermsOfService = () => {
    navigation.navigate('TermsOfService');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>User information</Text>
          </View>
          
          <View style={styles.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={24} color="#007AFF" />
          </View>
        </View>

        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="account-off" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>No user data found</Text>
          <Text style={styles.errorSubText}>
            Please login again to view your profile
          </Text>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <MaterialCommunityIcons name="login" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Consistent with MyGroupsScreen */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>
            {user.fullName || 'User'}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={onRefresh}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color="#007AFF" />
            </View>
          </View>
          
          <Text style={styles.userName}>{user.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user.email || 'No email'}</Text>
          
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account" size={16} color="#6c757d" />
              <Text style={styles.statText}>
                {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : 'Not set'}
              </Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="shield-account" size={16} color="#6c757d" />
              <Text style={styles.statText}>{user.role || 'Member'}</Text>
            </View>
            
            {user.createdAt && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#6c757d" />
                  <Text style={styles.statText}>
                    Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Account Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleAccountSettings}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="account-cog" size={22} color="#007AFF" />
                <Text style={styles.menuText}>Account Settings</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleNotifications}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="bell" size={22} color="#FF9500" />
                <Text style={styles.menuText}>Notifications</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleHelpSupport}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="help-circle" size={22} color="#FF3B30" />
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handlePrivacyPolicy}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="shield" size={22} color="#4CD964" />
                <Text style={styles.menuText}>Privacy Policy</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleTermsOfService}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="file-document" size={22} color="#6c757d" />
                <Text style={styles.menuText}>Terms of Service</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.appInfo}>
              <MaterialCommunityIcons name="checkbox-multiple-marked-circle" size={24} color="#007AFF" />
              <View style={styles.appInfoText}>
                <Text style={styles.appName}>Group Task</Text>
                <Text style={styles.appDescription}>Flexible task management for any group</Text>
              </View>
            </View>
            
            <View style={styles.appDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Version</Text>
                <Text style={styles.detailValue}>1.0.0</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Build</Text>
                <Text style={styles.detailValue}>2024.01</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Platform</Text>
                <Text style={styles.detailValue}>React Native</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Header - Consistent with MyGroupsScreen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 96,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  // Scroll Content
  scrollContent: {
    paddingBottom: 24,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  // Profile Card
  profileCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#dee2e6',
  },
  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    paddingLeft: 4,
  },
  // Menu Cards
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#212529',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f3f5',
    marginLeft: 48,
  },
  // App Info Card
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  appInfoText: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  appDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  appDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});