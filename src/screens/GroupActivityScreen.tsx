import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GroupActivityService } from '../services/GroupActivityService';

export default function GroupActivityScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activityData, setActivityData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityData();
  }, [groupId]);

  const fetchActivityData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await GroupActivityService.getGroupActivitySummary(groupId);
      
      if (result.success) {
        setActivityData(result.data);
      } else {
        setError(result.message || 'Failed to load activity data');
      }
    } catch (err: any) {
      console.error('Error fetching activity data:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewMemberDetails = (memberId: string) => {
    navigation.navigate('MemberContributions', {
      groupId,
      groupName,
      memberId,
      userRole
    });
  };

  const handleViewTaskHistory = () => {
    navigation.navigate('TaskCompletionHistory', {
      groupId,
      groupName,
      userRole
    });
  };

  const handleViewFullLeaderboard = () => {
    navigation.navigate('FullLeaderboard', { groupId, groupName });
  };

  const renderSummaryCards = () => {
    const summary = activityData?.summary;
    if (!summary) return null;

    const cards = [
      {
        title: 'Members',
        value: summary.totalMembers,
        icon: 'account-group',
        color: '#007AFF'
      },
      {
        title: 'Tasks',
        value: summary.totalTasks,
        icon: 'format-list-checks',
        color: '#34c759'
      },
      {
        title: 'Completion',
        value: `${Math.round(summary.points?.completionRate || 0)}%`,
        icon: 'percent',
        color: '#e67700'
      },
      {
        title: 'Points',
        value: summary.points?.earned || 0,
        icon: 'star',
        color: '#ffd700'
      }
    ];

    return (
      <View style={styles.cardsGrid}>
        {cards.map((card, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.cardIcon, { backgroundColor: card.color + '20' }]}>
              <MaterialCommunityIcons name={card.icon as any} size={24} color={card.color} />
            </View>
            <Text style={styles.cardValue}>{card.value}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAssignmentStats = () => {
    const assignments = activityData?.summary?.assignments;
    if (!assignments) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Week Progress</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(assignments.completed / assignments.total) * 100}%`,
                  backgroundColor: '#34c759'
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {assignments.completed}/{assignments.total} completed
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: '#34c75920' }]}>
            <Text style={[styles.statBoxValue, { color: '#34c759' }]}>{assignments.verified}</Text>
            <Text style={styles.statBoxLabel}>Verified</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#e6770020' }]}>
            <Text style={[styles.statBoxValue, { color: '#e67700' }]}>{assignments.pendingVerification}</Text>
            <Text style={styles.statBoxLabel}>Pending</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fa525220' }]}>
            <Text style={[styles.statBoxValue, { color: '#fa5252' }]}>{assignments.rejected}</Text>
            <Text style={styles.statBoxLabel}>Rejected</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#dc354520' }]}>
            <Text style={[styles.statBoxValue, { color: '#dc3545' }]}>{assignments.neglected}</Text>
            <Text style={styles.statBoxLabel}>Neglected</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMemberContributions = () => {
    const members = activityData?.memberContributions || [];
    if (members.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Contributors</Text>
          <TouchableOpacity onPress={handleViewFullLeaderboard}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {members.slice(0, 5).map((member: any, index: number) => (
          <TouchableOpacity
            key={member.id}
            style={styles.memberCard}
            onPress={() => handleViewMemberDetails(member.id)}
            activeOpacity={0.7}
          >
            <View style={styles.memberRank}>
              {index === 0 ? (
                <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
              ) : index === 1 ? (
                <MaterialCommunityIcons name="trophy" size={18} color="#C0C0C0" />
              ) : index === 2 ? (
                <MaterialCommunityIcons name="trophy" size={16} color="#CD7F32" />
              ) : (
                <Text style={styles.rankNumber}>{index + 1}</Text>
              )}
            </View>

            <View style={styles.memberInfo}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {member.fullName?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.memberDetails}>
                <Text style={styles.memberName}>{member.fullName}</Text>
                <Text style={styles.memberStats}>
                  {member.completedAssignments || 0}/{member.totalAssignments || 0} • {member.earnedPoints || 0} pts
                </Text>
              </View>
            </View>

            <View style={styles.memberBadge}>
              <Text style={styles.memberPercentage}>
                {member.totalAssignments ? 
                  Math.round((member.completedAssignments / member.totalAssignments) * 100) : 0}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {groupName} Activity
        </Text>
      </View>
      <TouchableOpacity onPress={handleViewTaskHistory} style={styles.historyButton}>
        <MaterialCommunityIcons name="history" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading activity data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchActivityData(true)} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchActivityData()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderSummaryCards()}
            {renderAssignmentStats()}
            {renderMemberContributions()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529'
  },
  historyButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d'
  },
  content: {
    flex: 1,
    padding: 16
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 12
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600'
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  cardTitle: {
    fontSize: 14,
    color: '#6c757d'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '500'
  },
  progressContainer: {
    marginBottom: 16
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'right'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#6c757d'
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  memberRank: {
    width: 30,
    alignItems: 'center'
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d'
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  memberInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  memberDetails: {
    flex: 1
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4
  },
  memberStats: {
    fontSize: 12,
    color: '#6c757d'
  },
  memberBadge: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  memberPercentage: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600'
  }
});