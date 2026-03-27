// src/screens/ProfileScreen.tsx - Animated + Consistent Design
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthService } from '../services/AuthService';
import { useImageUpload } from '../uploadHook/useImageUpload';
import { useFeedback } from '../feedbackHook/useFeedback';
import { useNotifications } from '../notificationHook/useNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { API_BASE_URL } from '../config/api';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { profileStyles } from '../styles/profile.styles';

const { width } = Dimensions.get('window');

// ─── Color Palette ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2b8a3e',
  primaryDark: '#1e6b2c',
  primaryLight: '#d3f9d8',
  secondary: '#f8f9fa',
  tertiary: '#e9ecef',
  dark: '#212529',
  gray: '#868e96',
  lightGray: '#adb5bd',
  error: '#fa5252',
  white: '#ffffff',
  black: '#1a1a2e',
  warning: '#e67700',
  red: '#fa5252',
  redDark: '#e03131',
};

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ── Animation Values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const profileCardAnim = useRef(new Animated.Value(0)).current;
  const accountSectionAnim = useRef(new Animated.Value(0)).current;
  const feedbackSectionAnim = useRef(new Animated.Value(0)).current;
  const supportSectionAnim = useRef(new Animated.Value(0)).current;
  const aboutSectionAnim = useRef(new Animated.Value(0)).current;
  const logoutAnim = useRef(new Animated.Value(0)).current;

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

  // ── Entrance Animations
  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(profileCardAnim, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(accountSectionAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
        Animated.timing(feedbackSectionAnim, { toValue: 1, duration: 400, delay: 250, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(supportSectionAnim, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
        Animated.timing(aboutSectionAnim, { toValue: 1, duration: 400, delay: 350, useNativeDriver: true }),
      ]),
      Animated.timing(logoutAnim, { toValue: 1, duration: 400, delay: 400, useNativeDriver: true }),
    ]).start();
  }, []);

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

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });

    setAuthError(!hasToken);
    return hasToken;
  }, []);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const user = await TokenUtils.getUser();
        if (user) {
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
  }, [authError, navigation]);

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
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={profileStyles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!user) {
    return (
      <ScreenWrapper style={profileStyles.container}>
        <Animated.View style={[profileStyles.header, { opacity: headerAnim }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={profileStyles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.gray} />
          </TouchableOpacity>

          <Text style={profileStyles.headerTitle}>Profile</Text>

          <View style={profileStyles.headerRight} />
        </Animated.View>

        <View style={profileStyles.errorContainer}>
          <MaterialCommunityIcons name="account-off" size={64} color={COLORS.error} />
          <Text style={profileStyles.errorText}>No user data found</Text>
          <Text style={profileStyles.errorSubText}>
            Please login again to view your profile
          </Text>

          <TouchableOpacity
            style={profileStyles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={profileStyles.primaryButtonGradient}
            >
              <MaterialCommunityIcons name="login" size={18} color={COLORS.white} />
              <Text style={profileStyles.primaryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={profileStyles.container}>
      {/* Header with Animation */}
      <Animated.View
        style={[
          profileStyles.header,
          {
            opacity: headerAnim,
            transform: [{
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={profileStyles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.gray} />
        </TouchableOpacity>

        <Text style={profileStyles.headerTitle}>Profile</Text>

        <TouchableOpacity
          onPress={handleNotifications}
          style={profileStyles.notificationButton}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.primary} />
          {unreadCount > 0 && (
            <Animated.View
              style={[
                profileStyles.notificationBadge,
                {
                  transform: [{
                    scale: new Animated.Value(1)
                  }]
                }
              ]}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={profileStyles.notificationBadgeGradient}
              >
                <Text style={profileStyles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
            enabled={!uploading}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={profileStyles.scrollContent}
      >
        {/* Profile Header Card with Animation */}
        <Animated.View
          style={[
            {
              opacity: profileCardAnim,
              transform: [{
                scale: profileCardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={[COLORS.white, COLORS.secondary]}
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
                      colors={[COLORS.secondary, COLORS.tertiary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={profileStyles.avatarPlaceholder}
                    >
                      <ActivityIndicator size="large" color={COLORS.primary} />
                    </LinearGradient>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
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
                        setUser({ ...user, avatarUrl: null });
                      }}
                    />
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={profileStyles.editIcon}
                    >
                      <MaterialCommunityIcons name="camera" size={14} color={COLORS.white} />
                    </LinearGradient>
                  </>
                ) : (
                  <>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={profileStyles.avatarPlaceholder}
                    >
                      <Text style={profileStyles.avatarText}>
                        {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </LinearGradient>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={profileStyles.editIcon}
                    >
                      <MaterialCommunityIcons name="camera-plus" size={14} color={COLORS.white} />
                    </LinearGradient>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <Text style={profileStyles.userName}>{user.fullName || 'User'}</Text>
            <Text style={profileStyles.userEmail}>{user.email || 'No email'}</Text>

            <View style={profileStyles.userStats}>
              <View style={profileStyles.statItem}>
                <MaterialCommunityIcons name="account" size={14} color={COLORS.gray} />
                <Text style={profileStyles.statText}>
                  {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : 'Not set'}
                </Text>
              </View>

              <View style={profileStyles.statDivider} />

              <View style={profileStyles.statItem}>
                <MaterialCommunityIcons name="shield-account" size={14} color={COLORS.gray} />
                <Text style={profileStyles.statText}>{user.role || 'Member'}</Text>
              </View>

              {user.createdAt && (
                <>
                  <View style={profileStyles.statDivider} />
                  <View style={profileStyles.statItem}>
                    <MaterialCommunityIcons name="calendar" size={14} color={COLORS.gray} />
                    <Text style={profileStyles.statText}>
                      Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Account Settings Section */}
        <Animated.View
          style={[
            profileStyles.section,
            {
              opacity: accountSectionAnim,
              transform: [{
                translateY: accountSectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <Text style={profileStyles.sectionTitle}>Account Settings</Text>

          <LinearGradient
            colors={[COLORS.white, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profileStyles.menuCard}
          >
            <TouchableOpacity
              style={profileStyles.menuItem}
              onPress={handleAccountSettings}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="account-cog" size={18} color={COLORS.primary} />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Account Settings</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.lightGray} />
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
                  colors={[COLORS.secondary, COLORS.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons
                    name={uploading ? "image-sync" : "image-edit"}
                    size={18}
                    color={COLORS.primary}
                  />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>
                  {uploading ? 'Uploading Picture...' : 'Change Profile Picture'}
                </Text>
              </View>
              {!uploading && (
                <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.lightGray} />
              )}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Feedback Section */}
        <Animated.View
          style={[
            profileStyles.section,
            {
              opacity: feedbackSectionAnim,
              transform: [{
                translateY: feedbackSectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <Text style={profileStyles.sectionTitle}>Feedback</Text>

          <LinearGradient
            colors={[COLORS.white, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profileStyles.menuCard}
          >
            <TouchableOpacity
              style={profileStyles.menuItem}
              onPress={handleSendFeedback}
              activeOpacity={0.7}
              disabled={uploading || feedbackLoading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="message" size={18} color={COLORS.warning} />
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
              <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.lightGray} />
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
                  colors={[COLORS.secondary, COLORS.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="history" size={18} color={COLORS.primary} />
                </LinearGradient>
                <View style={profileStyles.menuTextContainer}>
                  <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>My Feedback History</Text>
                  {feedbackStats && (
                    <View style={profileStyles.feedbackStats}>
                      {feedbackStats.open > 0 && (
                        <View style={[profileStyles.statusDot, { backgroundColor: COLORS.warning }]} />
                      )}
                      {feedbackStats.resolved > 0 && (
                        <View style={[profileStyles.statusDot, { backgroundColor: COLORS.primary }]} />
                      )}
                      <Text style={profileStyles.feedbackStatsText}>
                        {feedbackStats.open} open · {feedbackStats.resolved} resolved
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.lightGray} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Support Section */}
        <Animated.View
          style={[
            profileStyles.section,
            {
              opacity: supportSectionAnim,
              transform: [{
                translateY: supportSectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <Text style={profileStyles.sectionTitle}>Support & Legal</Text>

          <LinearGradient
            colors={[COLORS.white, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profileStyles.menuCard}
          >
            <TouchableOpacity
              style={profileStyles.menuItem}
              onPress={handleHelpSupport}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={profileStyles.menuItemLeft}>
                <LinearGradient
                  colors={[COLORS.secondary, COLORS.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="help-circle" size={18} color={COLORS.error} />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Help & Support</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.lightGray} />
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
                  colors={[COLORS.secondary, COLORS.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="shield" size={18} color={COLORS.primary} />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Privacy Policy</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.lightGray} />
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
                  colors={[COLORS.secondary, COLORS.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={profileStyles.menuIcon}
                >
                  <MaterialCommunityIcons name="file-document" size={18} color={COLORS.gray} />
                </LinearGradient>
                <Text style={[profileStyles.menuText, uploading && profileStyles.disabledText]}>Terms of Service</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.lightGray} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* About Section */}
        <Animated.View
          style={[
            profileStyles.section,
            {
              opacity: aboutSectionAnim,
              transform: [{
                translateY: aboutSectionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }]
            }
          ]}
        >
          <Text style={profileStyles.sectionTitle}>About</Text>

          <LinearGradient
            colors={[COLORS.white, COLORS.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profileStyles.infoCard}
          >
            <View style={profileStyles.appInfo}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={profileStyles.appIcon}
              >
                <MaterialCommunityIcons name="checkbox-multiple-marked-circle" size={22} color={COLORS.white} />
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
        </Animated.View>

        {/* Logout Button */}
        <Animated.View
          style={[
            {
              opacity: logoutAnim,
              transform: [{
                scale: logoutAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })
              }] 
            }
          ]}
        >
          <TouchableOpacity
            style={[profileStyles.logoutButton, uploading && profileStyles.buttonDisabled]}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={uploading}
          >
            <LinearGradient
              colors={[COLORS.red, COLORS.redDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={profileStyles.logoutButtonGradient}
            >
              <MaterialCommunityIcons name="logout" size={18} color={COLORS.white} />
              <Text style={profileStyles.logoutButtonText}>
                {uploading ? 'Please wait...' : 'Logout'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}