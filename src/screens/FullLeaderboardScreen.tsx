// src/screens/FullLeaderboardScreen.tsx - UPDATED with dark gray primary and token checking
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskService } from '../services/TaskService';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../components/ScreenWrapper';

export const FullLeaderboardScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [authError, setAuthError] = useState(false);

  // Check token before making requests
  const checkToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.warn('🔐 FullLeaderboardScreen: No auth token available');
        setAuthError(true);
        return false;
      }
      console.log('✅ FullLeaderboardScreen: Auth token found');
      setAuthError(false);
      return true;
    } catch (error) {
      console.error('❌ FullLeaderboardScreen: Error checking token:', error);
      setAuthError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    loadLeaderboardData();
  }, [groupId]);

  // Show auth error if needed
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
    // Check token first
    const hasToken = await checkToken();
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Using TaskService.getTaskStatistics which already has pointsByUser
      const result = await TaskService.getTaskStatistics(groupId);
      if (result.success && result.statistics?.pointsByUser) {
        // Convert pointsByUser object to array and sort by points
        const sortedUsers = Object.values(result.statistics.pointsByUser)
          .sort((a: any, b: any) => b.totalPoints - a.totalPoints);
        setLeaderboard(sortedUsers);
      } else {
        // Check if error is auth-related
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
        return <Text style={styles.rankNumber}>{index + 1}</Text>;
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: any; index: number }) => (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.leaderboardItem,
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
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {item.userName?.charAt(0).toUpperCase() || '?'}
            </Text>
          )}
        </LinearGradient>
        
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
    </LinearGradient>
  );

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#495057" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          style={styles.refreshButton}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#495057" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
          )}
        </TouchableOpacity>
      </View>

      {/* Group Name Banner */}
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.groupBanner}
      >
        <MaterialCommunityIcons name="account-group" size={16} color="#495057" />
        <Text style={styles.groupBannerText}>{groupName}</Text>
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
            colors={['#495057']}
            tintColor="#495057"
          />
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
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="trophy-outline" size={48} color="#adb5bd" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
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
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
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
  },
  refreshButton: {
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
  groupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  groupBannerText: {
    fontSize: 14,
    color: '#495057',
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
    color: '#212529',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 13,
    color: '#868e96',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    color: '#868e96',
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
    borderColor: '#e9ecef',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarText: {
    color: '#495057',
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 11,
    color: '#868e96',
  },
  pointsContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b8a3e',
  },
  pointsLabel: {
    fontSize: 9,
    color: '#868e96',
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
    borderColor: '#e9ecef',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
}); 