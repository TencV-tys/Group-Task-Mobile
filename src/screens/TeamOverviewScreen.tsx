// src/screens/TeamOverviewScreen.tsx - Dark Mode Added
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
import { useTheme } from '../context/ThemeContext';
import { makeTeamOverviewStyles } from '../styles/teamOverview.styles';

export const TeamOverviewScreen = ({ navigation, route }: any) => {
  const { theme, isDark } = useTheme();
  const styles = makeTeamOverviewStyles(theme);
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

  // In TeamOverviewScreen.tsx - Update loadTeamData function

  const loadTeamData = async () => {
  const hasToken = await checkToken();
  if (!hasToken) return;

  setLoading(true);
  setError(null);

  console.log('🔍 [TeamOverview] Loading team data for group:', groupId);

  try {
    const membersResult = await GroupMembersService.getGroupMembers(groupId);
    console.log('📦 [TeamOverview] Members result:', membersResult.success ? 'Success' : 'Failed');
    
    if (membersResult.success) {
      const activeMembers = (membersResult.members || []).filter((m: any) => m.isActive !== false);
      console.log(`👥 [TeamOverview] Total active members: ${activeMembers.length}`);
      
      const admins = activeMembers.filter((m: any) => m.role === 'ADMIN' || m.groupRole === 'ADMIN');
      setAdminCount(admins.length);
      console.log(`👑 [TeamOverview] Admins: ${admins.length}`);
      
      const regularMembers = activeMembers.filter((m: any) => {
        if (m.role === 'ADMIN' || m.groupRole === 'ADMIN') return false;
        return true;
      });
      
      console.log(`👥 [TeamOverview] Regular members: ${regularMembers.length}`);
      setAllMembers(regularMembers);
      
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
              // ✅ Filter out historical (deleted task) assignments before computing stats
              const allAssignments = tasksResult.data?.assignments || [];
              const activeAssignments = allAssignments.filter((a: any) => !a.isHistorical);

              console.log(`    📋 ${member.fullName}: ${allAssignments.length} total, ${allAssignments.length - activeAssignments.length} historical (excluded), ${activeAssignments.length} active`);

              const completed = activeAssignments.filter(
                (a: any) => a.completed
              ).length;

              const verified = activeAssignments.filter(
                (a: any) => a.verified === true
              ).length;

              const rejected = activeAssignments.filter(
                (a: any) => a.verified === false
              ).length;

              const pendingVerification = activeAssignments.filter(
                (a: any) => a.completed && a.verified === null
              ).length;

              const pending = activeAssignments.filter(
                (a: any) => !a.completed && !a.expired
              ).length;

              const expired = activeAssignments.filter(
                (a: any) => a.expired === true
              ).length;

              const totalTasks = activeAssignments.length;

              const earnedPoints = activeAssignments
                .filter((a: any) => a.verified === true)
                .reduce((sum: number, a: any) => sum + (a.points || 0), 0);

              const totalPoints = activeAssignments
                .reduce((sum: number, a: any) => sum + (a.points || 0), 0);

              const completionRate = totalTasks > 0
                ? Math.round((verified / totalTasks) * 100)
                : 0;

              console.log(`    ✅ ${member.fullName}:`, {
                totalTasks,
                completed,
                verified,
                rejected,
                pendingVerification,
                pending,
                expired,
                earnedPoints,
                totalPoints,
                completionRate
              });

              stats[member.userId] = {
                totalTasks,
                completed,
                verified,
                rejected,
                pending,
                pendingVerification,
                expired,
                totalPoints,
                earnedPoints,
                completionRate
              };

            } else {
              console.log(`    ❌ Failed to get assignments for ${member.fullName}`);
              stats[member.userId] = {
                totalTasks: 0,
                completed: 0,
                verified: 0,
                rejected: 0,
                pending: 0,
                pendingVerification: 0,
                expired: 0,
                totalPoints: 0,
                earnedPoints: 0,
                completionRate: 0
              };
            }
          } catch (err) {
            console.error(`    ❌ Error loading stats for member ${member.userId}:`, err);
            stats[member.userId] = {
              totalTasks: 0,
              completed: 0,
              verified: 0,
              rejected: 0,
              pending: 0,
              pendingVerification: 0,
              expired: 0,
              totalPoints: 0,
              earnedPoints: 0,
              completionRate: 0
            };
          }
        })
      );
      
      setMemberStats(stats);
      console.log('✅ [TeamOverview] Stats loaded for', Object.keys(stats).length, 'members');

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
    const completionColor = stats.completionRate >= 80 ? theme.primary : 
                           stats.completionRate >= 50 ? theme.primary : theme.error;

    return (
      <TouchableOpacity
        style={[styles.memberCard, { borderColor: theme.border }]}
        onPress={() => toggleMemberExpand(item.userId)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.memberInfo}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={[styles.avatar, { borderColor: theme.border }]} />
              ) : (
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  style={[styles.avatarPlaceholder, { borderColor: theme.border }]}
                >
                  <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
                    {item.fullName?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.memberDetails}>
                <View style={styles.nameRow}>
                  <Text style={[styles.memberName, { color: theme.text }]}>{item.fullName}</Text>
                  <Text style={[styles.rankNumber, { color: theme.primary, backgroundColor: theme.primaryLight }]}>#{index + 1}</Text>
                  {item.inRotation === true && (
                    <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.rotationBadge}>
                      <MaterialCommunityIcons name="sync" size={10} color={theme.primary} />
                      <Text style={[styles.rotationBadgeText, { color: theme.primary }]}>In Rotation</Text>
                    </LinearGradient>
                  )}
                  {item.inRotation === false && item.role !== 'ADMIN' && (
                    <LinearGradient colors={[theme.primaryLight, theme.primaryLight]} style={styles.inactiveBadge}>
                      <MaterialCommunityIcons name="pause" size={10} color={theme.primary} />
                      <Text style={[styles.inactiveBadgeText, { color: theme.primary }]}>Not in Rotation</Text>
                    </LinearGradient>
                  )}
                </View>
                <Text style={[styles.memberEmail, { color: theme.textMuted }]}>{item.email}</Text>
              </View>
            </View>
            <MaterialCommunityIcons 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={22} 
              color={theme.textMuted} 
            />
          </View>

          <View style={[styles.statsRow, { backgroundColor: theme.bgSecondary }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.earnedPoints}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: completionColor }]}>
                {stats.completionRate}%
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Completion</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{stats.verified}/{stats.totalTasks}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Verified</Text>
            </View>
          </View>

          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
              <View style={styles.detailGrid}>
                <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Total Tasks</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{stats.totalTasks}</Text>
                </View>
                <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Completed</Text>
                  <Text style={[styles.detailValue, { color: theme.primary }]}>{stats.completed}</Text>
                </View>
                <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Verified</Text>
                  <Text style={[styles.detailValue, { color: theme.primary }]}>{stats.verified}</Text>
                </View>
                <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Pending</Text>
                  <Text style={[styles.detailValue, { color: theme.primary }]}>{stats.pending}</Text>
                </View>
                <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Rejected</Text>
                  <Text style={[styles.detailValue, { color: theme.error }]}>{stats.rejected}</Text>
                </View>
                <View style={[styles.detailItem, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Total Points</Text>
                  <Text style={[styles.detailValue, { color: theme.primary }]}>{stats.totalPoints}</Text>
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
                  colors={[theme.primary, theme.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.viewButtonGradient}
                >
                  <MaterialCommunityIcons name="history" size={16} color="#fff" />
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
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Team Overview</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{groupName}</Text>
      </View>
      
      <TouchableOpacity onPress={handleRefresh} style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSortBar = () => {
    console.log(`🎯 [TeamOverview] Sort bar clicked - current sort: ${sortBy}`);
    
    return (
      <View style={styles.sortBar}>
        <Text style={[styles.sortLabel, { color: theme.textMuted }]}>Sort by:</Text>
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'points' && styles.sortOptionActive, { borderColor: theme.border }]}
          onPress={() => {
            console.log('📊 [TeamOverview] Sorting by POINTS');
            setSortBy('points');
          }}
        >
          <LinearGradient
            colors={sortBy === 'points' ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sortOptionGradient}
          >
            <Text style={[styles.sortOptionText, sortBy === 'points' && styles.sortOptionTextActive, { color: sortBy === 'points' ? '#fff' : theme.textSecondary }]}>
              Points
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'completion' && styles.sortOptionActive, { borderColor: theme.border }]}
          onPress={() => {
            console.log('📊 [TeamOverview] Sorting by COMPLETION');
            setSortBy('completion');
          }}
        >
          <LinearGradient
            colors={sortBy === 'completion' ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sortOptionGradient}
          >
            <Text style={[styles.sortOptionText, sortBy === 'completion' && styles.sortOptionTextActive, { color: sortBy === 'completion' ? '#fff' : theme.textSecondary }]}>
              Completion
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive, { borderColor: theme.border }]}
          onPress={() => {
            console.log('📊 [TeamOverview] Sorting by NAME');
            setSortBy('name');
          }}
        >
          <LinearGradient
            colors={sortBy === 'name' ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sortOptionGradient}
          >
            <Text style={[styles.sortOptionText, sortBy === 'name' && styles.sortOptionTextActive, { color: sortBy === 'name' ? '#fff' : theme.textSecondary }]}>
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
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.summaryCard, { borderColor: theme.border }]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>{sortedMembers.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Members</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>{totalPoints}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Total Points</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.primary }]}>{avgCompletion}%</Text>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Avg Completion</Text>
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderAdminNote = () => {
    if (adminCount === 0) return null;
    
    return (
      <LinearGradient
        colors={[theme.primaryLight, theme.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.adminNote, { borderColor: theme.primaryBorder }]}
      >
        <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
        <Text style={[styles.adminNoteText, { color: theme.primary }]}>
          {adminCount} admin{adminCount > 1 ? 's' : ''} are not shown here. This view shows regular members only.
        </Text>
      </LinearGradient>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading team data...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTeamData}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const sortedMembers = getSortedMembers();

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
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
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              style={[styles.emptyIconContainer, { borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="account-group" size={40} color={theme.primary} />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Members Found</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              This group doesn't have any active regular members yet
            </Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
};