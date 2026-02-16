import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LeaderboardService, LeaderboardEntry } from '../services/LeaderboardService';

export const FullLeaderboardScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'previous' | 'all'>('current');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadLeaderboard();
  }, [groupId, selectedWeek]);

  const loadLeaderboard = async (reset = true) => {
    if (reset) {
      setLoading(true);
      setPage(0);
    }

    try {
      const result = await LeaderboardService.getGroupLeaderboard(groupId, {
        week: selectedWeek === 'current' ? undefined : -1,
        limit,
        offset: reset ? 0 : page * limit,
      });

      if (result.success) {
        if (reset) {
          setLeaderboard(result.data.entries || []);
        } else {
          setLeaderboard(prev => [...prev, ...(result.data.entries || [])]);
        }
        setHasMore(result.data.entries?.length === limit);
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
    loadLeaderboard(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadLeaderboard(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Ionicons name="trophy" size={24} color="#FFD700" />;
      case 1:
        return <Ionicons name="trophy" size={22} color="#C0C0C0" />;
      case 2:
        return <Ionicons name="trophy" size={20} color="#CD7F32" />;
      default:
        return <Text style={styles.rankNumber}>{index + 1}</Text>;
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <View style={[
      styles.leaderboardItem,
      index === 0 && styles.firstPlace,
      index === 1 && styles.secondPlace,
      index === 2 && styles.thirdPlace,
    ]}>
      <View style={styles.rankContainer}>
        {getRankIcon(index)}
      </View>

      <View style={styles.userContainer}>
        <View style={styles.avatar}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {item.fullName?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.fullName}
          </Text>
          <Text style={styles.userStats}>
            {item.completedTasks} tasks • {item.completionRate}% completion
          </Text>
        </View>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.pointsValue}>{item.points}</Text>
        <Text style={styles.pointsLabel}>points</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
      </View>

      <View style={styles.weekSelector}>
        <TouchableOpacity
          style={[styles.weekButton, selectedWeek === 'current' && styles.weekButtonActive]}
          onPress={() => setSelectedWeek('current')}
        >
          <Text style={[styles.weekText, selectedWeek === 'current' && styles.weekTextActive]}>
            Current Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.weekButton, selectedWeek === 'previous' && styles.weekButtonActive]}
          onPress={() => setSelectedWeek('previous')}
        >
          <Text style={[styles.weekText, selectedWeek === 'previous' && styles.weekTextActive]}>
            Previous Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.weekButton, selectedWeek === 'all' && styles.weekButtonActive]}
          onPress={() => setSelectedWeek('all')}
        >
          <Text style={[styles.weekText, selectedWeek === 'all' && styles.weekTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item, index) => `${item.userId}-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Top Performers</Text>
            <Text style={styles.statsSubtitle}>
              {leaderboard.length} members • Based on points earned
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Data Yet</Text>
              <Text style={styles.emptyText}>
                Complete tasks to earn points and appear on the leaderboard
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={styles.loader} color="#4F46E5" />
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  groupName: {
    fontSize: 14,
    color: '#6B7280',
    maxWidth: 120,
  },
  weekSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weekButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  weekButtonActive: {
    backgroundColor: '#4F46E5',
  },
  weekText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  weekTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  firstPlace: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  secondPlace: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  thirdPlace: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
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
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  pointsContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  pointsLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loader: {
    marginVertical: 20,
  },
});