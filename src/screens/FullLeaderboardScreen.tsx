// src/screens/FullLeaderboardScreen.tsx - Dark Mode Added
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
import { TaskService } from '../services/TaskService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export const FullLeaderboardScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const { groupId, groupName } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [authError, setAuthError] = useState(false);

  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    setAuthError(!hasToken);
    return hasToken;
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
      const result = await TaskService.getTaskStatistics(groupId);
      if (result.success && result.statistics?.pointsByUser) {
        const sortedUsers = Object.values(result.statistics.pointsByUser)
          .sort((a: any, b: any) => b.totalPoints - a.totalPoints);
        setLeaderboard(sortedUsers);
      } else {
        if (result.message?.toLowerCase().includes('token') || 
            result.message?.toLowerCase().includes('auth')) {
          setAuthError(true);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLeaderboardData();
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />;
      case 1:
        return <MaterialCommunityIcons name="trophy" size={22} color="#C0C0C0" />;
      case 2:
        return <MaterialCommunityIcons name="trophy" size={20} color="#CD7F32" />;
      default:
        return <Text style={[styles.rankNumber, { color: theme.textMuted }]}>{index + 1}</Text>;
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: any; index: number }) => (
    <LinearGradient
      colors={[theme.card, theme.bgSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.leaderboardItem,
        { borderColor: theme.border },
        index === 0 && styles.firstPlace,
        index === 1 && styles.secondPlace,
        index === 2 && styles.thirdPlace,
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
              {item.userName?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </LinearGradient>
        
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={[styles.userStats, { color: theme.textMuted }]}>
            {item.assignments?.length || 0} tasks
          </Text>
        </View>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={[styles.pointsValue, { color: theme.primary }]}>{item.totalPoints}</Text>
        <Text style={[styles.pointsLabel, { color: theme.textMuted }]}>points</Text>
      </View>
    </LinearGradient>
  );

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

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Leaderboard</Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
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
        keyExtractor={(item, index) => `${item.userId}-${index}`}
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
            <Text style={[styles.statsTitle, { color: theme.text }]}>Top Performers</Text>
            <Text style={[styles.statsSubtitle, { color: theme.textMuted }]}>
              {leaderboard.length} members • Based on points earned
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
              Complete tasks to earn points and appear on the leaderboard
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 13,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  firstPlace: {
    borderColor: '#ffd43b',
    borderWidth: 2,
  },
  secondPlace: {
    borderColor: '#ced4da',
    borderWidth: 2,
  },
  thirdPlace: {
    borderColor: '#d97706',
    borderWidth: 2,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  userContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 11,
  },
  pointsContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  pointsLabel: {
    fontSize: 9,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
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
});