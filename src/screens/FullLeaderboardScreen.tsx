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
import { TaskService } from '../services/TaskService';

export const FullLeaderboardScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    loadLeaderboardData();
  }, [groupId]);

  const loadLeaderboardData = async () => {
    try {
      // Using TaskService.getTaskStatistics which already has pointsByUser
      const result = await TaskService.getTaskStatistics(groupId);
      if (result.success && result.statistics?.pointsByUser) {
        // Convert pointsByUser object to array and sort by points
        const sortedUsers = Object.values(result.statistics.pointsByUser)
          .sort((a: any, b: any) => b.totalPoints - a.totalPoints);
        setLeaderboard(sortedUsers);
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
        return <Ionicons name="trophy" size={24} color="#FFD700" />;
      case 1:
        return <Ionicons name="trophy" size={22} color="#C0C0C0" />;
      case 2:
        return <Ionicons name="trophy" size={20} color="#CD7F32" />;
      default:
        return <Text style={styles.rankNumber}>{index + 1}</Text>;
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: any; index: number }) => (
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
              {item.userName?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={styles.userStats}>
            {item.assignments?.length || 0} tasks
          </Text>
        </View>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.pointsValue}>{item.totalPoints}</Text>
        <Text style={styles.pointsLabel}>points</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
      </View>

      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item, index) => `${item.userId}-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Top Performers</Text>
            <Text style={styles.statsSubtitle}>
              {leaderboard.length} members • Based on points earned
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Complete tasks to earn points and appear on the leaderboard
            </Text>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
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
});