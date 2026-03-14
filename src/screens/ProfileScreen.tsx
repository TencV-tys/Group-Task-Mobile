// src/screens/ProfileScreen.tsx - REFACTORED with token checking
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image  
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { AuthService } from '../services/AuthService';
import { useImageUpload } from '../uploadHook/useImageUpload';
import { useFeedback } from '../feedbackHook/useFeedback';
import { useNotifications } from '../notificationHook/useNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { API_BASE_URL } from '../config/api';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { profileStyles } from '../styles/profile.styles';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const initialLoadDone = useRef(false);

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
    onSuccess: async (result) => {
      console.log('Upload success result:', result);
      await loadUserData(true);
      Alert.alert('Success', 'Profile picture updated successfully!');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    }
  });

  // ===== REAL-TIME NOTIFICATIONS =====
  useRealtimeNotifications({
    onNewNotification: (notification) => {
      if (notification.type === 'PROFILE_UPDATED' || 
          notification.type === 'AVATAR_UPDATED') {
        loadUserData(true);
      }
      loadUnreadCount();
    },
    showAlerts: true
  });

  // ===== TOKEN CHECK =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        setAuthError(true);
        return false;
      }
      setAuthError(false);
      return true;
    } catch (error) {
      setAuthError(true);
      return false;
    }
  }, []);

  // ===== GET USER ID =====
  useEffect(() => {
    const getUserId = async () => {
      try {
        const userStr = await SecureStore.getItemAsync('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    };
    getUserId();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError]);

  const loadUserData = async (forceRefresh = false) => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      let userData;
      if (forceRefresh) {
        userData = await AuthService.fetchFreshUserData();
      } else {
        userData = await AuthService.getCurrentUser();
      }
      
      if (isMounted.current) {
        console.log('Loaded user data:', userData);
        setUser(userData);
        await loadStats();
        await loadUnreadCount();
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load profile data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (!initialLoadDone.current) {
      loadUserData();
      initialLoadDone.current = true;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData(true);
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData(true);
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
    if (uploading) return;
    
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
            if (result.success && isMounted.current) {
              setUser((prevUser: any) => ({
                ...prevUser,
                avatarUrl: null
              }));
              Alert.alert('Success', 'Profile picture removed successfully');
            }
          }
        }
      ]
    );
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

  const handleSendFeedback = () => {
    navigation.navigate('Feedback');
  };

  const handleViewFeedbackHistory = () => {
    navigation.navigate('FeedbackHistory');
  };

  if (loading) {
    return (
      <ScreenWrapper style={profileStyles.container}>
        <View style={profileStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={profileStyles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!user) {
    return (
      <ScreenWrapper style={profileStyles.container}>
        <View style={profileStyles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={profileStyles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          
          <Text style={profileStyles.headerTitle}>Profile</Text>
          
          <View style={profileStyles.headerRight} />
        </View>

        <View style={profileStyles.errorContainer}>
          <MaterialCommunityIcons name="account-off" size={64} color="#fa5252" />
          <Text style={profileStyles.errorText}>No user data found</Text>
          <Text style={profileStyles.errorSubText}>
            Please login again to view your profile
          </Text>
          
          <TouchableOpacity 
            style={profileStyles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={profileStyles.primaryButtonGradient}
            >
              <MaterialCommunityIcons name="login" size={18} color="white" />
              <Text style={profileStyles.primaryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={profileStyles.container}>
      {/* Header */}
      <View style={profileStyles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={profileStyles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        
        <Text style={profileStyles.headerTitle}>Profile</Text>
        
        <TouchableOpacity 
          onPress={handleNotifications}
          style={profileStyles.notificationButton}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color="#2b8a3e" />
          {unreadCount > 0 && (
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={profileStyles.notificationBadge}
            >
              <Text style={profileStyles.notificationBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
            enabled={!uploading}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={profileStyles.scrollContent}
      >
        {/* Profile Header Card */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={profileStyles.profileCard}
        >
          <TouchableOpacity 
            onPress={handleAvatarPress}
            disabled={uploading}
            style={profileStyles.avatarTouchable}
          >
            <View style={profileStyles.avatarContainer}>
              {uploading ? (
                <View style={profileStyles.avatarUploadingContainer}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={profileStyles.avatarPlaceholder}
                  >
                    <ActivityIndicator size="large" color="#2b8a3e" />
                  </LinearGradient>
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={profileStyles.uploadingOverlay}
                  >
                    <Text style={profileStyles.uploadingText}>
                      {Math.round(progress)}%
                    </Text>
                  </LinearGradient>
                </View>
              ) : user.avatarUrl ? (
                <>
                  <Image
                    source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE_URL}${user.avatarUrl}` }}
                    style={profileStyles.avatarImage}
                    onError={(e) => {
                      console.log('Avatar load error:', e.nativeEvent.error);
                      setUser({...user, avatarUrl: null});
                    }}
                  />
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={profileStyles.editIcon}
                  >
                    <MaterialCommunityIcons name="camera" size={14} color="white" />
                  </LinearGradient>
                </>
              ) : (
                <>
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={profileStyles.avatarPlaceholder}
                  >
                    <Text style={profileStyles.avatarText}>
                      {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={['#2b8a3e', '#1e6b2c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={profileStyles.editIcon}
                  >
                    <MaterialCommunityIcons name="camera-plus" size={14} color="white" />
                  </LinearGradient>
                </>
              )}
            </View>
          </TouchableOpacity>
          
          <Text style={profileStyles.userName}>{user.fullName || 'User'}</Text>
          <Text style={profileStyles.userEmail}>{user.email || 'No email'}</Text>
          
          <View style={profileStyles.userStats}>
            <View style={profileStyles.statItem}>
              <MaterialCommunityIcons name="account" size={14} color="#868e96" />
              <Text style={profileStyles.statText}>
                {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : 'Not set'}
              </Text>
            </View>
            
            <View style={profileStyles.statDivider} />
            
            <View style={profileStyles.statItem}>
              <MaterialCommunityIcons name="shield-account" size={14} color="#868e96" />
              <Text style={profileStyles.statText}>{user.role || 'Member'}</Text>
            </View>
            
            {user.createdAt && (
              <>
                <View style={profileStyles.statDivider} />
                <View style={profileStyles.statItem}>
                  <MaterialCommunityIcons name="calendar" size={14} color="#868e96" />
                  <Text style={profileStyles.statText}>
                    Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        {/* Account Settings Section */}
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Account Settings</Text>
          
          <View style={profileStyles.menuCard}>
            <TouchableOpacity 
              style={profileStyles.menuItem}
              onPress={handleAccountSettings}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="account-cog" size={18} color="#2b8a3e" />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Account Settings</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={profileStyles.divider} />
            
            <TouchableOpacity 
              style={profileStyles.menuItem}
              onPress={handleAvatarPress}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons 
                    name={uploading ? "image-sync" : "image-edit"} 
                    size={18} 
                    color="#2b8a3e" 
                  />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>
                  {uploading ? 'Uploading Picture...' : 'Change Profile Picture'}
                </Text>
              </View>
              {!uploading && (
                <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Feedback Section */}
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Feedback</Text>
          
          <View style={profileStyles.menuCard}>
            <TouchableOpacity 
              style={profileStyles.menuItem}
              onPress={handleSendFeedback}
              activeOpacity={0.7}
              disabled={uploading || feedbackLoading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="message" size={18} color="#e67700" />
                </LinearGradient>
                <View style={profileStyles.menuTextContainer}>
                  <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Send Feedback</Text>
                  {feedbackStats && feedbackStats.total > 0 && (
                    <Text style={profileStyles.menuBadgeText}>
                      {feedbackStats.total} submitted
                    </Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={profileStyles.divider} />
            
            <TouchableOpacity 
              style={profileStyles.menuItem}
              onPress={handleViewFeedbackHistory}
              activeOpacity={0.7}
              disabled={uploading || feedbackLoading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="history" size={18} color="#2b8a3e" />
                </LinearGradient>
                <View style={profileStyles.menuTextContainer}>
                  <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>My Feedback History</Text>
                  {feedbackStats && (
                    <View style={profileStyles.feedbackStats}>
                      {feedbackStats.open > 0 && (
                        <View style={[profileStyles.statusDot, { backgroundColor: '#e67700' }]} />
                      )}
                      {feedbackStats.resolved > 0 && (
                        <View style={[profileStyles.statusDot, { backgroundColor: '#2b8a3e' }]} />
                      )}
                      <Text style={profileStyles.feedbackStatsText}>
                        {feedbackStats.open} open · {feedbackStats.resolved} resolved
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Support & Legal</Text>
          
          <View style={profileStyles.menuCard}>
            <TouchableOpacity 
              style={profileStyles.menuItem}
              onPress={handleHelpSupport}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="help-circle" size={18} color="#fa5252" />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Help & Support</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={profileStyles.divider} />
            
            <TouchableOpacity 
              style={profileStyles.menuItem}
              onPress={handlePrivacyPolicy}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="shield" size={18} color="#2b8a3e" />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Privacy Policy</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={profileStyles.divider} />
            
            <TouchableOpacity 
              style={profileStyles.menuItem}
              onPress={handleTermsOfService}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="file-document" size={18} color="#868e96" />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Terms of Service</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Section */}
        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>About</Text>
          
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profileStyles.infoCard}
          >
            <View style={profileStyles.appInfo}>
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={profileStyles.appIcon}
              >
                <MaterialCommunityIcons name="checkbox-multiple-marked-circle" size={22} color="white" />
              </LinearGradient>
              <View style={profileStyles.appInfoText}>
                <Text style={profileStyles.appName}>Group Task</Text>
                <Text style={profileStyles.appDescription}>Flexible task management for any group</Text>
              </View>
            </View>
            
            <View style={profileStyles.appDetails}>
              <View style={profileStyles.detailItem}>
                <Text style={profileStyles.detailLabel}>Version</Text>
                <Text style={profileStyles.detailValue}>1.0.0</Text>
              </View>
              <View style={profileStyles.detailItem}>
                <Text style={profileStyles.detailLabel}>Build</Text>
                <Text style={profileStyles.detailValue}>2024.01</Text>
              </View>
              <View style={profileStyles.detailItem}>
                <Text style={profileStyles.detailLabel}>Platform</Text>
                <Text style={profileStyles.detailValue}>React Native</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[profileStyles.logoutButton, uploading && profileStyles.buttonDisabled]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={uploading}
        >
          <LinearGradient
            colors={['#fa5252', '#e03131']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profileStyles.logoutButtonGradient}
          >
            <MaterialCommunityIcons name="logout" size={18} color="white" />
            <Text style={profileStyles.logoutButtonText}>
              {uploading ? 'Please wait...' : 'Logout'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}