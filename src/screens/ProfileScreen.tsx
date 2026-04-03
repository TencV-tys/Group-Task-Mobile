// src/screens/ProfileScreen.tsx - Fixed Version
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AuthService } from '../services/AuthService';
import { useImageUpload } from '../uploadHook/useImageUpload';
import { useFeedback } from '../feedbackHook/useFeedback';
import { useNotifications } from '../notificationHook/useNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { TokenUtils } from '../utils/tokenUtils';
import { API_BASE_URL } from '../config/api';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { makeProfileStyles } from '../styles/profile.styles';

// Memoized component for StatItem
const StatItem = React.memo(({ icon, value }: { icon: string; value: string }) => {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialCommunityIcons name={icon as any} size={14} color={theme.textMuted} />
      <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '500' }}>{value}</Text>
    </View>
  );
});

export default function ProfileScreen({ navigation }: any) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeProfileStyles(theme), [theme]);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Animation values
  const animations = useMemo(() => ({
    header: new Animated.Value(0),
    profileCard: new Animated.Value(0),
    sections: new Animated.Value(0),
    logout: new Animated.Value(0),
  }), []);

  const isMounted = useRef(true);

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
    onSuccess: async () => {
      await loadUserData(true);
      Alert.alert('Success', 'Profile picture updated successfully!');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update profile picture');
    }
  });

  // Animation startup
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animations.header, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(animations.profileCard, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
      Animated.timing(animations.sections, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
      Animated.timing(animations.logout, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load user data
  const loadUserData = useCallback(async (forceRefresh = false) => {
    try {
      const hasToken = await TokenUtils.checkToken({ showAlert: false });
      if (!hasToken) {
        if (isMounted.current) {
          setAuthError(true);
          setLoading(false);
        }
        return;
      }

      const userData = forceRefresh 
        ? await AuthService.fetchFreshUserData()
        : await AuthService.getCurrentUser();

      if (isMounted.current && userData) {
        setUser(userData);
        await Promise.all([loadStats(), loadUnreadCount()]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loadStats, loadUnreadCount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData(true);
  }, [loadUserData]);

  // Auth error handler
  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
      ]);
    }
  }, [authError, navigation]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      loadUserData(true);
    }, [loadUserData])
  );

  // Real-time notifications
  useRealtimeNotifications({
    onNewNotification: useCallback((notification) => {
      if (notification.type === 'PROFILE_UPDATED' || notification.type === 'AVATAR_UPDATED') {
        loadUserData(true);
      }
      loadUnreadCount();
    }, [loadUserData, loadUnreadCount]),
    showAlerts: true
  });

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout }
    ]);
  }, []);

  const performLogout = useCallback(async () => {
    try {
      const result = await AuthService.logout();
      if (result.success) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (error) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [navigation]);

  const handleAvatarPress = useCallback(() => {
    if (uploading) return;
    Alert.alert('Change Profile Picture', 'How would you like to update your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => takePhotoWithCamera().then(img => img && uploadAvatarFromPicker(img)) },
      { text: 'Choose from Gallery', onPress: () => pickImageFromGallery().then(img => img && uploadAvatarFromPicker(img)) },
      user?.avatarUrl && { text: 'Remove Picture', style: 'destructive', onPress: handleRemoveAvatar }
    ].filter(Boolean));
  }, [uploading, user?.avatarUrl]);

  const handleRemoveAvatar = useCallback(async () => {
    Alert.alert('Remove Profile Picture', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteAvatar();
          if (result.success && isMounted.current) {
            setUser((prev: any) => ({ ...prev, avatarUrl: null }));
            Alert.alert('Success', 'Profile picture removed');
          }
        }
      }
    ]);
  }, [deleteAvatar]);

  const navigateTo = useCallback((route: string) => {
    navigation.navigate(route);
  }, [navigation]);

  // Loading state
  if (loading) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Error state
  if (!user) {
    return (
      <ScreenWrapper style={styles.container}>
        <Animated.View style={[styles.header, { opacity: animations.header }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </Animated.View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="account-off" size={64} color={theme.error} />
          <Text style={styles.errorText}>No user data found</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.primaryButtonGradient}>
              <MaterialCommunityIcons name="login" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: animations.header, transform: [{ translateY: animations.header.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigateTo('Notifications')} style={styles.notificationButton}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={theme.primary} />
           {unreadCount > 0 && (
  <Animated.View style={styles.notificationBadge}>
    <Text style={styles.notificationBadgeText}>
      {unreadCount > 9 ? '9+' : unreadCount}
    </Text>
  </Animated.View>
)}
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <Animated.View style={{ opacity: animations.profileCard, transform: [{ scale: animations.profileCard.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
          <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.profileCard}>
            <TouchableOpacity onPress={handleAvatarPress} disabled={uploading} style={styles.avatarTouchable}>
              <View style={styles.avatarContainer}>
                {uploading ? (
                  <View style={styles.avatarUploadingContainer}>
                    <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.avatarPlaceholder}>
                      <ActivityIndicator size="large" color={theme.primary} />
                    </LinearGradient>
                    <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.uploadingOverlay}>
                      <Text style={styles.uploadingText}>{Math.round(progress)}%</Text>
                    </LinearGradient>
                  </View>
                ) : user.avatarUrl ? (
                  <>
                    <Image source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE_URL}${user.avatarUrl}` }} style={styles.avatarImage} />
                    <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.editIcon}>
                      <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                    </LinearGradient>
                  </>
                ) : (
                  <>
                    <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{user.fullName?.charAt(0)?.toUpperCase() || 'U'}</Text>
                    </LinearGradient>
                    <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.editIcon}>
                      <MaterialCommunityIcons name="camera-plus" size={14} color="#fff" />
                    </LinearGradient>
                  </>
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{user.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{user.email || 'No email'}</Text>
            <View style={styles.userStats}>
              <StatItem icon="account" value={user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set'} />
              <View style={styles.statDivider} />
              <StatItem icon="shield-account" value={user.role || 'Member'} />
              {user.createdAt && (
                <>
                  <View style={styles.statDivider} />
                  <StatItem icon="calendar" value={`Joined ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`} />
                </>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Sections */}
        <Animated.View style={{ opacity: animations.sections }}>
          {/* Appearance Section - Theme Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.menuCard}>
              <ThemeToggle /> 
            </LinearGradient>
          </View>

          {/* Account Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.menuCard}>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('AccountSettings')} disabled={uploading}>
                <View style={styles.menuItemLeft}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.menuIcon}>
                    <MaterialCommunityIcons name="account-cog" size={18} color={theme.primary} />
                  </LinearGradient>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>Account Settings</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={handleAvatarPress} disabled={uploading}>
                <View style={styles.menuItemLeft}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.menuIcon}>
                    <MaterialCommunityIcons name={uploading ? "image-sync" : "image-edit"} size={18} color={theme.primary} />
                  </LinearGradient>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>
                    {uploading ? 'Uploading Picture...' : 'Change Profile Picture'}
                  </Text>
                </View>
                {!uploading && <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />}
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Feedback Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feedback</Text>
            <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.menuCard}>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('Feedback')} disabled={uploading || feedbackLoading}>
                <View style={styles.menuItemLeft}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.menuIcon}>
                    <MaterialCommunityIcons name="message" size={18} color="#e67700" />
                  </LinearGradient>
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, (uploading || feedbackLoading) && styles.disabledText]}>Send Feedback</Text>
                    {feedbackStats && feedbackStats.total > 0 && (
                      <Text style={styles.menuBadgeText}>{feedbackStats.total} submitted</Text>
                    )}
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('FeedbackHistory')} disabled={uploading || feedbackLoading}>
                <View style={styles.menuItemLeft}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.menuIcon}>
                    <MaterialCommunityIcons name="history" size={18} color={theme.primary} />
                  </LinearGradient>
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuText, (uploading || feedbackLoading) && styles.disabledText]}>My Feedback History</Text>
                    {feedbackStats && (
                      <View style={styles.feedbackStats}>
                        <View style={[styles.statusDot, { backgroundColor: '#e67700' }]} />
                        <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
                        <Text style={styles.feedbackStatsText}>
                          {feedbackStats.open} open · {feedbackStats.resolved} resolved
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Legal</Text>
            <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.menuCard}>
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('HelpSupport')} disabled={uploading}>
                <View style={styles.menuItemLeft}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.menuIcon}>
                    <MaterialCommunityIcons name="help-circle" size={18} color={theme.error} />
                  </LinearGradient>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>Help & Support</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('PrivacyPolicy')} disabled={uploading}>
                <View style={styles.menuItemLeft}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.menuIcon}>
                    <MaterialCommunityIcons name="shield" size={18} color={theme.primary} />
                  </LinearGradient>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>Privacy Policy</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('TermsOfService')} disabled={uploading}>
                <View style={styles.menuItemLeft}>
                  <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.menuIcon}>
                    <MaterialCommunityIcons name="file-document" size={18} color={theme.textMuted} />
                  </LinearGradient>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>Terms of Service</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <LinearGradient colors={[theme.card, theme.bgSecondary]} style={styles.infoCard}>
              <View style={styles.appInfo}>
                <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.appIcon}>
                  <MaterialCommunityIcons name="checkbox-multiple-marked-circle" size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.appInfoText}>
                  <Text style={styles.appName}>Group Task</Text>
                  <Text style={styles.appDescription}>Flexible task management for any group</Text>
                </View>
              </View>
              <View style={styles.appDetails}>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Version</Text><Text style={styles.detailValue}>1.0.0</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Build</Text><Text style={styles.detailValue}>2024.01</Text></View>
                <View style={styles.detailItem}><Text style={styles.detailLabel}>Platform</Text><Text style={styles.detailValue}>React Native</Text></View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View style={{ opacity: animations.logout, transform: [{ scale: animations.logout.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
          <TouchableOpacity style={[styles.logoutButton, uploading && styles.buttonDisabled]} onPress={handleLogout} disabled={uploading}>
            <LinearGradient colors={[theme.error, '#e03131']} style={styles.logoutButtonGradient}>
              <MaterialCommunityIcons name="logout" size={18} color="#fff" />
              <Text style={styles.logoutButtonText}>{uploading ? 'Please wait...' : 'Logout'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  ); 
}