// src/screens/ProfileScreen.tsx - FIXED VERSION
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
  RefreshControl,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { useImageUpload } from '../uploadHook/useImageUpload';
import { useFeedback } from '../feedbackHook/useFeedback';
import { useNotifications } from '../notificationHook/useNotifications';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {
    loading: feedbackLoading,
    stats: feedbackStats,
    loadStats
  } = useFeedback();

  const { unreadCount, loadUnreadCount } = useNotifications();

  const {
    uploading,
    progress,
    pickImageFromGallery,
    takePhotoWithCamera,
    uploadAvatarFromPicker,
    deleteAvatar
  } = useImageUpload({
    onSuccess: (result) => {
      if (result.data?.user) {
        setUser(result.data.user);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else if (result.success) {
        loadUserData(); // Refresh user data
        Alert.alert('Success', result.message);
      }
    },
    onError: (error) => {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    }
  });

  const loadUserData = async () => {
    try {
      const userData = await AuthService.getCurrentUser();
      console.log('Loaded user data:', userData);
      setUser(userData);
      
      // Load feedback stats
      await loadStats();
      
      // Load notification count
      await loadUnreadCount();
      
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

  const handleAvatarPress = () => {
    Alert.alert(
      'Change Profile Picture',
      'How would you like to update your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
        user?.avatarUrl && { 
          text: 'Remove Picture', 
          style: 'destructive', 
          onPress: handleRemoveAvatar 
        },
      ].filter(Boolean) as any
    );
  };

  const handleTakePhoto = async () => {
    const image = await takePhotoWithCamera();
    if (image) {
      await uploadAvatarFromPicker(image);
    }
  };

  const handleChooseFromGallery = async () => {
    const image = await pickImageFromGallery();
    if (image) {
      await uploadAvatarFromPicker(image);
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAvatar();
            if (result.success) {
              loadUserData(); // Refresh to show default avatar
            }
          }
        }
      ]
    );
  };

  const handleAccountSettings = () => {
    Alert.alert('Coming Soon', 'Account settings will be available soon!');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleHelpSupport = () => {
    Alert.alert('Help & Support', 'Email us at: support@grouptask.com');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Our privacy policy will be available soon.');
  };

  const handleTermsOfService = () => {
    Alert.alert('Terms of Service', 'Our terms of service will be available soon.');
  };

  // Feedback handlers
  const handleSendFeedback = () => {
    navigation.navigate('Feedback');
  };

 const handleViewFeedbackHistory = () => {
  navigation.navigate('Feedback', { showHistory: true });
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
            <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Profile</Text>
          
          <View style={styles.rightPlaceholder} />
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
      {/* Header - FIXED: Title is now visible and notification on right */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Profile</Text>
        
        {/* Notification Bell - Moved to right side */}
        <TouchableOpacity 
          onPress={handleNotifications}
          style={styles.notificationButton}
        >
          <MaterialCommunityIcons name="bell" size={24} color="#333" />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            enabled={!uploading}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            onPress={handleAvatarPress}
            disabled={uploading}
            style={styles.avatarTouchable}
          >
            <View style={styles.avatarContainer}>
              {uploading ? (
                <View style={styles.avatarUploadingContainer}>
                  <View style={styles.avatarPlaceholder}>
                    <ActivityIndicator size="large" color="#007AFF" />
                  </View>
                  <View style={styles.uploadingOverlay}>
                    <Text style={styles.uploadingText}>
                      {Math.round(progress)}%
                    </Text>
                  </View>
                </View>
              ) : user.avatarUrl ? (
                <>
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.avatarImage}
                  />
                  <View style={styles.editIcon}>
                    <MaterialCommunityIcons name="camera" size={16} color="white" />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.editIcon}>
                    <MaterialCommunityIcons name="camera-plus" size={16} color="white" />
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
          
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

        {/* REMOVED: Quick Stats Section - This was useless */}

        {/* Account Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleAccountSettings}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="account-cog" size={22} color="#007AFF" />
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Account Settings</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleAvatarPress}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons 
                  name={uploading ? "image-sync" : "image-edit"} 
                  size={22} 
                  color={uploading ? "#6c757d" : "#AF52DE"} 
                />
                <Text style={[styles.menuText, uploading && styles.disabledText]}>
                  {uploading ? 'Uploading Picture...' : 'Change Profile Picture'}
                </Text>
              </View>
              {!uploading && (
                <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleSendFeedback}
              activeOpacity={0.7}
              disabled={uploading || feedbackLoading}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="message" size={22} color="#FF9500" />
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>Send Feedback</Text>
                  {feedbackStats && feedbackStats.total > 0 && (
                    <Text style={styles.menuBadgeText}>
                      {feedbackStats.total} submitted
                    </Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleViewFeedbackHistory}
              activeOpacity={0.7}
              disabled={uploading || feedbackLoading}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="history" size={22} color="#5856D6" />
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>My Feedback History</Text>
                  {feedbackStats && (
                    <View style={styles.feedbackStats}>
                      {feedbackStats.open > 0 && (
                        <View style={[styles.statusDot, { backgroundColor: '#FF9500' }]} />
                      )}
                      {feedbackStats.resolved > 0 && (
                        <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                      )}
                      <Text style={styles.feedbackStatsText}>
                        {feedbackStats.open} open · {feedbackStats.resolved} resolved
                      </Text>
                    </View>
                  )}
                </View>
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
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="help-circle" size={22} color="#FF3B30" />
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Help & Support</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handlePrivacyPolicy}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="shield" size={22} color="#4CD964" />
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Privacy Policy</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleTermsOfService}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons name="file-document" size={22} color="#6c757d" />
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Terms of Service</Text>
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
          style={[styles.logoutButton, uploading && styles.buttonDisabled]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={uploading}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>
            {uploading ? 'Please wait...' : 'Logout'}
          </Text>
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
  // Header - FIXED
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  rightPlaceholder: {
    width: 40,
  },
  // Notification Button - MOVED TO RIGHT
  notificationButton: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
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
  avatarTouchable: {
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarUploadingContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  uploadingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingVertical: 4,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  uploadingText: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
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
  // REMOVED: Quick Stats section styles
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
    flex: 1,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    color: '#212529',
  },
  menuBadgeText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  disabledText: {
    color: '#6c757d',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f3f5',
    marginLeft: 48,
  },
  // Feedback specific styles
  feedbackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  feedbackStatsText: {
    fontSize: 11,
    color: '#6c757d',
    marginLeft: 4,
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
  buttonDisabled: {
    backgroundColor: '#adb5bd',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 