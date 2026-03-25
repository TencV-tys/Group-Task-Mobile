// src/screens/TeamOverviewScreen.tsx - WITH CONSOLE LOGS FOR DEBUGGING
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { GroupMembersService } from '../services/GroupMemberService';
import { AssignmentService } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { teamOverviewStyles as styles } from '../styles/teamOverview.styles';

export const TeamOverviewScreen = ({ navigation, route }: any) => {
  const { groupId, groupName } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [memberStats, setMemberStats] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<'points' | 'completion' | 'name'>('points');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // ===== TOKEN CHECK =====
  const checkToken = useCallback(async (): Promise<boolean> => {
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    return hasToken;
  }, []);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [authError]);

  useFocusEffect(
    useCallback(() => {
      loadTeamData();
    }, [groupId])
  );

  const loadTeamData = async () => {
    const hasToken = await checkToken();
    if (!hasToken) return;

    setLoading(true);
    setError(null);

    console.log('🔍 [TeamOverview] Loading team data for group:', groupId);

    try {
      // Get all members
      const membersResult = await GroupMembersService.getGroupMembers(groupId);
      console.log('📦 [TeamOverview] Members result:', membersResult.success ? 'Success' : 'Failed');
      
      if (membersResult.success) {
        const activeMembers = (membersResult.members || []).filter((m: any) => m.isActive !== false);
        console.log(`👥 [TeamOverview] Total active members: ${activeMembers.length}`);
        
        // Count admins
        const admins = activeMembers.filter((m: any) => m.role === 'ADMIN' || m.groupRole === 'ADMIN');
        setAdminCount(admins.length);
        console.log(`👑 [TeamOverview] Admins: ${admins.length}`);
        
        // Filter out admins
        const regularMembers = activeMembers.filter((m: any) => {
          if (m.role === 'ADMIN' || m.groupRole === 'ADMIN') {
            return false;
          }
          return true;
        });
        
        console.log(`👥 [TeamOverview] Regular members: ${regularMembers.length}`);
        
        setAllMembers(regularMembers);
        
        // Get stats for each regular member
        const stats: Record<string, any> = {};
        
        console.log('📊 [TeamOverview] Fetching stats for each member...');
        
        await Promise.all(
          regularMembers.map(async (member: any) => {
            try {
              console.log(`  📈 Fetching stats for: ${member.fullName} (${member.userId})`);
              const tasksResult = await AssignmentService.getUserAssignments(member.userId, {
                limit: 100
              });
              
              if (tasksResult.success) {
                const assignments = tasksResult.assignments || [];
                const completed = assignments.filter((a: any) => a.completed);
                const verified = completed.filter((a: any) => a.verified === true);
                const rejected = completed.filter((a: any) => a.verified === false);
                const pending = completed.filter((a: any) => a.verified === null);
                
                const totalPoints = assignments.reduce((sum: number, a: any) => sum + (a.points || 0), 0);
                const earnedPoints = verified.reduce((sum: number, a: any) => sum + (a.points || 0), 0);
                const completionRate = assignments.length > 0 
                  ? Math.round((completed.length / assignments.length) * 100) 
                  : 0;
                
                stats[member.userId] = {
                  totalTasks: assignments.length,
                  completed: completed.length,
                  verified: verified.length,
                  rejected: rejected.length,
                  pending: pending.length,
                  totalPoints,
                  earnedPoints,
                  completionRate
                };
                
                console.log(`    ✅ ${member.fullName}: Points=${earnedPoints}, Completion=${completionRate}%, Tasks=${assignments.length}`);
              } else {
                console.log(`    ❌ Failed to get stats for ${member.fullName}`);
              }
            } catch (err) {
              console.error(`    ❌ Error loading stats for member ${member.userId}:`, err);
            }
          })
        );
        
        setMemberStats(stats);
        console.log('✅ [TeamOverview] Stats loaded:', Object.keys(stats).length, 'members have stats');
      } else {
        setError(membersResult.message || 'Failed to load team data');
        console.log('❌ [TeamOverview] Failed to load members:', membersResult.message);
      }
    } catch (err: any) {
      console.error('❌ [TeamOverview] Error loading team data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('✅ [TeamOverview] Loading complete');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTeamData();
  };

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMember(expandedMember === memberId ? null : memberId);
  };

  // ===== SORTED MEMBERS WITH CONSOLE LOGS =====
  const getSortedMembers = () => {
    const membersWithStats = allMembers.map(member => ({
      ...member,
      stats: memberStats[member.userId] || {
        totalTasks: 0,
        completed: 0,
        verified: 0,
        rejected: 0,
        pending: 0,
        totalPoints: 0,
        earnedPoints: 0,
        completionRate: 0
      }
    }));

    console.log(`🔄 [TeamOverview] Sorting ${membersWithStats.length} members by: ${sortBy}`);
    
    const sorted = [...membersWithStats].sort((a, b) => {
      if (sortBy === 'points') {
        const aPoints = a.stats.earnedPoints || 0;
        const bPoints = b.stats.earnedPoints || 0;
        console.log(`  Comparing points: ${a.fullName} (${aPoints}) vs ${b.fullName} (${bPoints}) -> ${bPoints - aPoints}`);
        return bPoints - aPoints;
      }
      if (sortBy === 'completion') {
        const aComp = a.stats.completionRate || 0;
        const bComp = b.stats.completionRate || 0;
        console.log(`  Comparing completion: ${a.fullName} (${aComp}%) vs ${b.fullName} (${bComp}%) -> ${bComp - aComp}`);
        return bComp - aComp;
      }
      const aName = a.fullName || '';
      const bName = b.fullName || '';
      console.log(`  Comparing names: ${aName} vs ${bName} -> ${aName.localeCompare(bName)}`);
      return aName.localeCompare(bName);
    });
    
    console.log(`📊 [TeamOverview] Sorted order (${sortBy}):`);
    sorted.forEach((member, idx) => {
      if (sortBy === 'points') {
        console.log(`  ${idx + 1}. ${member.fullName} - ${member.stats.earnedPoints} pts`);
      } else if (sortBy === 'completion') {
        console.log(`  ${idx + 1}. ${member.fullName} - ${member.stats.completionRate}%`);
      } else {
        console.log(`  ${idx + 1}. ${member.fullName}`);
      }
    });
    
    return sorted;
  };

  // ===== RENDER MEMBER CARD =====
  const renderMemberCard = ({ item, index }: { item: any; index: number }) => {
    const stats = item.stats;
    const isExpanded = expandedMember === item.userId;
    const completionColor = stats.completionRate >= 80 ? '#2b8a3e' : 
                           stats.completionRate >= 50 ? '#e67700' : '#fa5252';

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => toggleMemberExpand(item.userId)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.memberInfo}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  style={styles.avatarPlaceholder}
                >
                  <Text style={styles.avatarText}>
                    {item.fullName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.memberDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{item.fullName}</Text>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                  {item.inRotation === true && (
                    <LinearGradient colors={['#d3f9d8', '#b2f2bb']} style={styles.rotationBadge}>
                      <MaterialCommunityIcons name="sync" size={10} color="#2b8a3e" />
                      <Text style={styles.rotationBadgeText}>In Rotation</Text>
                    </LinearGradient>
                  )}
                  {item.inRotation === false && item.role !== 'ADMIN' && (
                    <LinearGradient colors={['#fff3bf', '#ffec99']} style={styles.inactiveBadge}>
                      <MaterialCommunityIcons name="pause" size={10} color="#e67700" />
                      <Text style={styles.inactiveBadgeText}>Not in Rotation</Text>
                    </LinearGradient>
                  )}
                </View>
                <Text style={styles.memberEmail}>{item.email}</Text>
              </View>
            </View>
            <MaterialCommunityIcons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={22} 
              color="#adb5bd" 
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.earnedPoints}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: completionColor }]}>
                {stats.completionRate}%
              </Text>
              <Text style={styles.statLabel}>Completion</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.verified}/{stats.totalTasks}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Tasks</Text>
                  <Text style={styles.detailValue}>{stats.totalTasks}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Completed</Text>
                  <Text style={[styles.detailValue, { color: '#2b8a3e' }]}>{stats.completed}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Verified</Text>
                  <Text style={[styles.detailValue, { color: '#2b8a3e' }]}>{stats.verified}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Pending</Text>
                  <Text style={[styles.detailValue, { color: '#e67700' }]}>{stats.pending}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Rejected</Text>
                  <Text style={[styles.detailValue, { color: '#fa5252' }]}>{stats.rejected}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Points</Text>
                  <Text style={[styles.detailValue, { color: '#e67700' }]}>{stats.totalPoints}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('MemberContributions', {
                  groupId,
                  groupName,
                  memberId: item.userId,
                  userRole: 'ADMIN'
                })}
              >
                <LinearGradient
                  colors={['#2b8a3e', '#1e6b2c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.viewButtonGradient}
                >
                  <MaterialCommunityIcons name="history" size={16} color="white" />
                  <Text style={styles.viewButtonText}>View Detailed History</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Team Overview</Text>
        <Text style={styles.subtitle}>{groupName}</Text>
      </View>
      
      <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color="#2b8a3e" />
        ) : (
          <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSortBar = () => {
    console.log(`🎯 [TeamOverview] Sort bar clicked - current sort: ${sortBy}`);
    
    return (
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'points' && styles.sortOptionActive]}
          onPress={() => {
            console.log('📊 [TeamOverview] Sorting by POINTS');
            setSortBy('points');
          }}
        >
          <LinearGradient
            colors={sortBy === 'points' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sortOptionGradient}
          >
            <Text style={[styles.sortOptionText, sortBy === 'points' && styles.sortOptionTextActive]}>
              Points
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'completion' && styles.sortOptionActive]}
          onPress={() => {
            console.log('📊 [TeamOverview] Sorting by COMPLETION');
            setSortBy('completion');
          }}
        >
          <LinearGradient
            colors={sortBy === 'completion' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sortOptionGradient}
          >
            <Text style={[styles.sortOptionText, sortBy === 'completion' && styles.sortOptionTextActive]}>
              Completion
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive]}
          onPress={() => {
            console.log('📊 [TeamOverview] Sorting by NAME');
            setSortBy('name');
          }}
        >
          <LinearGradient
            colors={sortBy === 'name' ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sortOptionGradient}
          >
            <Text style={[styles.sortOptionText, sortBy === 'name' && styles.sortOptionTextActive]}>
              Name
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSummary = () => {
    const sortedMembers = getSortedMembers();
    const totalPoints = sortedMembers.reduce((sum, m) => sum + (m.stats.earnedPoints || 0), 0);
    const avgCompletion = sortedMembers.length > 0
      ? Math.round(sortedMembers.reduce((sum, m) => sum + (m.stats.completionRate || 0), 0) / sortedMembers.length)
      : 0;

    console.log(`📊 [TeamOverview] Summary: ${sortedMembers.length} members, ${totalPoints} total points, ${avgCompletion}% avg completion`);

    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{sortedMembers.length}</Text>
            <Text style={styles.summaryLabel}>Members</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalPoints}</Text>
            <Text style={styles.summaryLabel}>Total Points</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{avgCompletion}%</Text>
            <Text style={styles.summaryLabel}>Avg Completion</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderAdminNote = () => {
    if (adminCount === 0) return null;
    
    return (
      <LinearGradient
        colors={['#e7f5ff', '#d0ebff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.adminNote}
      >
        <MaterialCommunityIcons name="information" size={16} color="#2b8a3e" />
        <Text style={styles.adminNoteText}>
          {adminCount} admin{adminCount > 1 ? 's' : ''} are not shown here. This view shows regular members only.
        </Text>
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading team data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTeamData}>
            <LinearGradient colors={['#2b8a3e', '#1e6b2c']} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const sortedMembers = getSortedMembers();

  return (
    <ScreenWrapper style={styles.container}>
      {renderHeader()}
      {renderSummary()}
      {renderAdminNote()}
      {renderSortBar()}

      <FlatList
        data={sortedMembers}
        renderItem={({ item, index }) => renderMemberCard({ item, index })}
        keyExtractor={(item) => item.userId || item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="account-group" size={40} color="#2b8a3e" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Members Found</Text>
            <Text style={styles.emptySubtext}>
              This group doesn't have any active regular members yet
            </Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
};