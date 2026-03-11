// src/screens/ProfileScreen.tsx - UPDATED with correct colors and navigation
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { useImageUpload } from '../uploadHook/useImageUpload';
import { useFeedback } from '../feedbackHook/useFeedback';
import { useNotifications } from '../notificationHook/useNotifications';
import { API_BASE_URL } from '../config/api';
import { ScreenWrapper } from '../components/ScreenWrapper';
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
  onSuccess: async (result) => {
    console.log('Upload success result:', result);
    
    // Force refresh user data from server
    await loadUserData(true); // Pass true to force refresh
    
    Alert.alert('Success', 'Profile picture updated successfully!');
  },
  onError: (error) => {
    console.error('Upload error:', error);
    Alert.alert('Error', 'Failed to update profile picture');
  }
});

const loadUserData = async (forceRefresh = false) => {
  try {
    let userData;
    if (forceRefresh) {
      // Force fetch from server
      userData = await AuthService.fetchFreshUserData();
    } else {
      // Get from cache
      userData = await AuthService.getCurrentUser();
    }
    
    console.log('Loaded user data:', userData);
    console.log('Avatar URL:', userData?.avatarUrl); 
    setUser(userData);
    
    await loadStats();
    await loadUnreadCount();
    
  } catch (error) {
    console.error('Error loading user data:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

 useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    // Force refresh when screen comes into focus
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
            // Update user state to remove avatar
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

 // Replace the handleAccountSettings function:
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
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!user) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Profile</Text>
          
          <View style={styles.headerRight} />
        </View>

        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="account-off" size={64} color="#fa5252" />
          <Text style={styles.errorText}>No user data found</Text>
          <Text style={styles.errorSubText}>
            Please login again to view your profile
          </Text>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <MaterialCommunityIcons name="login" size={18} color="white" />
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
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Profile</Text>
        
        <TouchableOpacity 
          onPress={handleNotifications}
          style={styles.notificationButton}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color="#2b8a3e" />
          {unreadCount > 0 && (
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.notificationBadge}
            >
              <Text style={styles.notificationBadgeText}>
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header Card */}
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <TouchableOpacity 
            onPress={handleAvatarPress}
            disabled={uploading}
            style={styles.avatarTouchable}
          >
            <View style={styles.avatarContainer}>
          {uploading ? (
  <View style={styles.avatarUploadingContainer}>
    <LinearGradient
      colors={['#f8f9fa', '#e9ecef']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatarPlaceholder}
    >
      <ActivityIndicator size="large" color="#2b8a3e" />
    </LinearGradient>
    <LinearGradient
      colors={['#2b8a3e', '#1e6b2c']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.uploadingOverlay}
    >
      <Text style={styles.uploadingText}>
        {Math.round(progress)}%
      </Text>
    </LinearGradient>
  </View>
) : user.avatarUrl ? (
  <>
    <Image
      source={{ uri: user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_BASE_URL}${user.avatarUrl}` }}
      style={styles.avatarImage}
      onError={(e) => {
        console.log('Avatar load error:', e.nativeEvent.error);
        // Fallback to placeholder on error
        setUser({...user, avatarUrl: null});
      }}
    />
    <LinearGradient
      colors={['#2b8a3e', '#1e6b2c']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.editIcon}
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
      style={styles.avatarPlaceholder}
    >
      <Text style={styles.avatarText}>
        {user.fullName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
      </Text>
    </LinearGradient>
    <LinearGradient
      colors={['#2b8a3e', '#1e6b2c']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.editIcon}
    >
      <MaterialCommunityIcons name="camera-plus" size={14} color="white" />
    </LinearGradient>
  </>
)}
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user.email || 'No email'}</Text>
          
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account" size={14} color="#868e96" />
              <Text style={styles.statText}>
                {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : 'Not set'}
              </Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="shield-account" size={14} color="#868e96" />
              <Text style={styles.statText}>{user.role || 'Member'}</Text>
            </View>
            
            {user.createdAt && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="calendar" size={14} color="#868e96" />
                  <Text style={styles.statText}>
                    Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

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
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuIcon}
                >
                  <MaterialCommunityIcons name="account-cog" size={18} color="#2b8a3e" />
                </LinearGradient>
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Account Settings</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleAvatarPress}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuIcon}
                >
                  <MaterialCommunityIcons 
                    name={uploading ? "image-sync" : "image-edit"} 
                    size={18} 
                    color="#2b8a3e" 
                  />
                </LinearGradient>
                <Text style={[styles.menuText, uploading && styles.disabledText]}>
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
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuIcon}
                >
                  <MaterialCommunityIcons name="message" size={18} color="#e67700" />
                </LinearGradient>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>Send Feedback</Text>
                  {feedbackStats && feedbackStats.total > 0 && (
                    <Text style={styles.menuBadgeText}>
                      {feedbackStats.total} submitted
                    </Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleViewFeedbackHistory}
              activeOpacity={0.7}
              disabled={uploading || feedbackLoading}
            >
              <View style={styles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuIcon}
                >
                  <MaterialCommunityIcons name="history" size={18} color="#2b8a3e" />
                </LinearGradient>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuText, uploading && styles.disabledText]}>My Feedback History</Text>
                  {feedbackStats && (
                    <View style={styles.feedbackStats}>
                      {feedbackStats.open > 0 && (
                        <View style={[styles.statusDot, { backgroundColor: '#e67700' }]} />
                      )}
                      {feedbackStats.resolved > 0 && (
                        <View style={[styles.statusDot, { backgroundColor: '#2b8a3e' }]} />
                      )}
                      <Text style={styles.feedbackStatsText}>
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
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuIcon}
                >
                  <MaterialCommunityIcons name="help-circle" size={18} color="#fa5252" />
                </LinearGradient>
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Help & Support</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handlePrivacyPolicy}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuIcon}
                >
                  <MaterialCommunityIcons name="shield" size={18} color="#2b8a3e" />
                </LinearGradient>
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Privacy Policy</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleTermsOfService}
              activeOpacity={0.7}
              disabled={uploading}
            >
              <View style={styles.menuItemLeft}>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuIcon}
                >
                  <MaterialCommunityIcons name="file-document" size={18} color="#868e96" />
                </LinearGradient>
                <Text style={[styles.menuText, uploading && styles.disabledText]}>Terms of Service</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#adb5bd" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoCard}
          >
            <View style={styles.appInfo}>
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.appIcon}
              >
                <MaterialCommunityIcons name="checkbox-multiple-marked-circle" size={22} color="white" />
              </LinearGradient>
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
          </LinearGradient>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, uploading && styles.buttonDisabled]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={uploading}
        >
          <LinearGradient
            colors={['#fa5252', '#e03131']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutButtonGradient}
          >
            <MaterialCommunityIcons name="logout" size={18} color="white" />
            <Text style={styles.logoutButtonText}>
              {uploading ? 'Please wait...' : 'Logout'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  notificationButton: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
  headerRight: {
    width: 36,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 14,
    color: '#868e96',
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
    fontSize: 16,
    color: '#fa5252',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 140,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  profileCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2b8a3e',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#2b8a3e',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  uploadingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
  },
  uploadingText: {
    fontSize: 11,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#868e96',
    marginBottom: 12,
    textAlign: 'center',
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#868e96',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#dee2e6',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    color: '#212529',
  },
  menuBadgeText: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  disabledText: {
    color: '#868e96',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f3f5',
    marginLeft: 60,
  },
  feedbackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  feedbackStatsText: {
    fontSize: 11,
    color: '#868e96',
    marginLeft: 4,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfoText: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  appDescription: {
    fontSize: 13,
    color: '#868e96',
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
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#868e96',
  },
  detailValue: {
    fontSize: 13,
    color: '#212529',
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#fa5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});