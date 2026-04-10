// src/screens/FullLeaderboardScreen.tsx - WITH ACCESS CONTROL FOR MEMBERS

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl, 
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GroupActivityService } from '../services/GroupActivityService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export const FullLeaderboardScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const { groupId, groupName, userRole } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [authError, setAuthError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const isAdmin = userRole === 'ADMIN';

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
  }, []);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await TokenUtils.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    loadLeaderboardData();
  }, [groupId]);

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

  const loadLeaderboardData = async () => {
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const result = await GroupActivityService.getLeaderboard(groupId);
      console.log('fullleaderboard:', result);
      if (result.success && result.data?.leaderboard) {
        console.log('fullleaderboard:', result.data?.leaderboard);
        setLeaderboard(result.data.leaderboard);
        setTotalPoints(result.data.totalPoints || 0);
      } else {
        setLeaderboard([]);
        setTotalPoints(0);
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
      setTotalPoints(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaderboardData();
  };

  // ✅ Handle leaderboard item press - with access control
  const handleLeaderboardPress = (member: any) => {
    const memberId = member.userId;
    if (!memberId) {
      Alert.alert('Error', 'Cannot view member details - missing ID');
      return;
    }
    
    // ✅ Check if user is clicking on their own profile
    if (memberId === currentUserId) {
      // Navigate to own details
      navigation.navigate('MemberContributions', { 
        groupId, 
        groupName, 
        memberId,
        userRole: userRole || 'MEMBER'
      });
    } else if (isAdmin) {
      // Admin can view any member's details
      navigation.navigate('MemberContributions', { 
        groupId, 
        groupName, 
        memberId,
        userRole: 'ADMIN'
      });
    } else {
      // Member trying to view another member's details - show alert
      Alert.alert(
        'Access Denied',
        'You can only view your own contributions. Admins can view all members.',
        [{ text: 'OK' }]
      );
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <MaterialCommunityIcons name="trophy" size={28} color="#FFD700" />;
      case 1:
        return <MaterialCommunityIcons name="trophy" size={24} color="#C0C0C0" />;
      case 2:
        return <MaterialCommunityIcons name="trophy" size={22} color="#CD7F32" />;
      default:
        return (
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            style={styles.rankCircle}
          >
            <Text style={[styles.rankNumber, { color: theme.textMuted }]}>{index + 1}</Text>
          </LinearGradient>
        );
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: any; index: number }) => {
    const isTop3 = index < 3;
    const points = item.points || 0;
    const isCurrentUser = item.userId === currentUserId;
    
    return (
      <TouchableOpacity
        onPress={() => handleLeaderboardPress(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.leaderboardItem,
            { borderColor: theme.border },
            isTop3 && styles.topRankItem,
            index === 0 && { borderColor: '#FFD700', borderWidth: 1.5 },
            index === 1 && { borderColor: '#C0C0C0', borderWidth: 1.5 },
            index === 2 && { borderColor: '#CD7F32', borderWidth: 1.5 },
            isCurrentUser && styles.currentUserItem,
          ]}
        >
          <View style={styles.rankContainer}>
            {getRankIcon(index)}
          </View>

          <View style={styles.userContainer}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatar, { borderColor: theme.border }]}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                  {item.fullName?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
            </LinearGradient>
            
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {item.fullName || 'Unknown'}
                {isCurrentUser && <Text style={[styles.youBadge, { color: theme.primary }]}> (You)</Text>}
              </Text>
              <View style={styles.userStatsRow}>
                <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
                <Text style={[styles.userStats, { color: theme.textMuted }]}>
                  Rank #{index + 1}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.pointsContainer}>
            <Text style={[styles.pointsValue, { color: theme.primary }]}>{points}</Text>
            <Text style={[styles.pointsLabel, { color: theme.textMuted }]}>pts</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading leaderboard...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (authError) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="lock-alert" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Authentication Error</Text>
          <Text style={[styles.errorSubtext, { color: theme.textMuted }]}>Please log in again</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient colors={[theme.error, theme.error]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Leaderboard</Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          style={[styles.refreshButton, { backgroundColor: theme.card }]}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color={theme.text} />
          )}
        </TouchableOpacity>
      </View>

      {/* Group Name Banner */}
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.groupBanner, { borderBottomColor: theme.border }]}
      >
        <MaterialCommunityIcons name="account-group" size={16} color={theme.textMuted} />
        <Text style={[styles.groupBannerText, { color: theme.textSecondary }]}>{groupName}</Text>
      </LinearGradient>

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item, index) => `${item.userId || index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.statsHeader}>
            <View style={styles.statsHeaderRow}>
              <Text style={[styles.statsTitle, { color: theme.text }]}>Top Performers</Text>
              <View style={[styles.totalPointsBadge, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.totalPointsText, { color: theme.primary }]}>{totalPoints}</Text>
                <Text style={[styles.totalPointsLabel, { color: theme.primary }]}>total pts</Text>
              </View>
            </View>
            <Text style={[styles.statsSubtitle, { color: theme.textMuted }]}>
              {leaderboard.length} members • Based on verified points only
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.emptyIconContainer, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="trophy-outline" size={48} color={theme.primary} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Data Yet</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Complete tasks and get them verified to earn points and appear on the leaderboard
            </Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  groupBannerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  statsHeader: {
    marginBottom: 20,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  totalPointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
  },
  totalPointsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPointsLabel: {
    fontSize: 9,
  },
  statsSubtitle: {
    fontSize: 13,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  topRankItem: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    marginRight: 8,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  userContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userStats: {
    fontSize: 11,
  },
  pointsContainer: {
    alignItems: 'center',
    minWidth: 65,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  pointsLabel: {
    fontSize: 10,
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: '#2b8a3e',
    backgroundColor: '#ebfbee',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  errorText: {
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  errorSubtext: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  }, 
  retryButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#fff',
  },
});