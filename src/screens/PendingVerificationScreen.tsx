// src/screens/PendingVerificationsScreen.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar, 
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssignmentService } from '../services/AssignmentService'; 

export default function PendingVerificationsScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [stats, setStats] = useState<any>(null);
  
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can access this screen');
      navigation.goBack();
      return;
    }
    fetchSubmissions();
    fetchStats();
  }, [groupId, filter]);

  const fetchStats = async () => {
    try {
      const result = await AssignmentService.getAssignmentStats(groupId);
      if (result.success && result.data) {
        setStats(result.data.summary);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchSubmissions = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    
    try {
      console.log(`Fetching ${filter} submissions for group:`, groupId);
      
      // Map filter to status parameter
      let statusParam: string | undefined;
      if (filter === 'pending') {
        statusParam = 'submitted'; // Get all submitted assignments
      } else if (filter === 'verified') {
        statusParam = 'verified';
      } else if (filter === 'rejected') {
        statusParam = 'rejected';
      }
      
      const result = await AssignmentService.getGroupAssignments(groupId, {
        status: statusParam,
        limit: 100
      });
      
      console.log('API Response:', result);
      
      if (result.success) {
        let assignments = result.assignments || result.data?.assignments || [];
        
        // For pending filter, ONLY show assignments that are:
        // 1. completed = true (submitted)
        // 2. verified = null (not yet approved/rejected)
        if (filter === 'pending') {
          assignments = assignments.filter((a: any) => 
            a.completed === true && a.verified === null
          );
        }
        
        const processed = assignments.map((assignment: any) => ({
          ...assignment,
          id: assignment.id,
          userName: assignment.user?.fullName || assignment.user?.name || 'Unknown User',
          userAvatar: assignment.user?.avatarUrl,
          userId: assignment.user?.id,
          taskId: assignment.task?.id || assignment.taskId,
          taskTitle: assignment.task?.title || assignment.taskTitle || 'Unknown Task',
          taskPoints: assignment.task?.points || assignment.points || 0,
          submittedAt: assignment.completedAt ? new Date(assignment.completedAt) : null,
          dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
          completed: assignment.completed || false,
          verified: assignment.verified,
          photoUrl: assignment.photoUrl,
          notes: assignment.notes,
          adminNotes: assignment.adminNotes,
          timeSlot: assignment.timeSlot
        }));
        
        setSubmissions(processed);
      } else {
        setError(result.message || 'Failed to load submissions');
      }
    } catch (err: any) {
      console.error('Error fetching submissions:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewSubmission = (assignmentId: string) => {
    navigation.navigate('AssignmentDetails', {
      assignmentId,
      isAdmin: true,
      onVerified: () => {
        fetchSubmissions();
        fetchStats();
      }
    });
  };

  const handleQuickApprove = async (assignmentId: string, taskTitle: string) => {
    Alert.alert(
      'Approve Submission',
      `Are you sure you want to approve "${taskTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              const result = await AssignmentService.verifyAssignment(assignmentId, {
                verified: true,
                adminNotes: 'Approved via quick action'
              });
              
              if (result.success) {
                Alert.alert('Success', 'Submission approved successfully');
                // Remove this item from the list immediately
                setSubmissions(prev => prev.filter(item => item.id !== assignmentId));
                // Refresh stats
                fetchStats();
                // Refresh the list to be safe
                fetchSubmissions();
              } else {
                Alert.alert('Error', result.message || 'Failed to approve submission');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve submission');
            }
          }
        }
      ]
    );
  };

  const handleQuickReject = async (assignmentId: string, taskTitle: string) => {
    Alert.alert(
      'Reject Submission',
      `Are you sure you want to reject "${taskTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await AssignmentService.verifyAssignment(assignmentId, {
                verified: false,
                adminNotes: 'Rejected via quick action'
              });
              
              if (result.success) {
                Alert.alert('Success', 'Submission rejected');
                // Remove this item from the list immediately
                setSubmissions(prev => prev.filter(item => item.id !== assignmentId));
                // Refresh stats
                fetchStats();
                // Refresh the list to be safe
                fetchSubmissions();
              } else {
                Alert.alert('Error', result.message || 'Failed to reject submission');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject submission');
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderStatsBar = () => {
    if (!stats) return null;
    
    return (
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.pendingVerification || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.verifiedAssignments || 0}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.rejectedAssignments || 0}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterTab, filter === 'pending' && styles.activeFilterTab]}
        onPress={() => setFilter('pending')}
      >
        <MaterialCommunityIcons 
          name="clock-check" 
          size={16} 
          color={filter === 'pending' ? '#007AFF' : '#868e96'} 
        />
        <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
          Pending
        </Text>
        {filter === 'pending' && stats?.pendingVerification > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{stats.pendingVerification}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, filter === 'verified' && styles.activeFilterTab]}
        onPress={() => setFilter('verified')}
      >
        <MaterialCommunityIcons 
          name="check-circle" 
          size={16} 
          color={filter === 'verified' ? '#2b8a3e' : '#868e96'} 
        />
        <Text style={[styles.filterText, filter === 'verified' && styles.activeFilterText]}>
          Verified
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, filter === 'rejected' && styles.activeFilterTab]}
        onPress={() => setFilter('rejected')}
      >
        <MaterialCommunityIcons 
          name="close-circle" 
          size={16} 
          color={filter === 'rejected' ? '#fa5252' : '#868e96'} 
        />
        <Text style={[styles.filterText, filter === 'rejected' && styles.activeFilterText]}>
          Rejected
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSubmissionItem = ({ item }: any) => {
    const isPending = filter === 'pending';
    const isVerified = filter === 'verified';
    const isRejected = filter === 'rejected';
    
    // IMPORTANT: Only show quick actions for assignments that are actually submitted (completed = true) and not verified
    const isSubmitted = item.completed === true && item.verified === null;
    
    return (
      <TouchableOpacity
        style={styles.submissionCard}
        onPress={() => handleViewSubmission(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              {item.userAvatar ? (
                <Image source={{ uri: item.userAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {item.userName?.charAt(0) || 'U'}
                </Text>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.userName}
              </Text>
              <Text style={styles.submissionTime}>
                {item.submittedAt 
                  ? `Submitted ${formatTimeAgo(item.submittedAt)}`
                  : 'Not submitted yet'}
              </Text>
            </View>
          </View>
          
          {isPending && item.completed === true && item.verified === null && (
            <View style={styles.pendingBadge}>
              <MaterialCommunityIcons name="clock" size={12} color="#e67700" />
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </View>
          )}
          {isPending && item.completed === false && (
            <View style={styles.notSubmittedBadge}>
              <MaterialCommunityIcons name="clock-outline" size={12} color="#6c757d" />
              <Text style={styles.notSubmittedBadgeText}>Not Submitted</Text>
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-circle" size={12} color="#2b8a3e" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
          {isRejected && (
            <View style={styles.rejectedBadge}>
              <MaterialCommunityIcons name="close-circle" size={12} color="#fa5252" />
              <Text style={styles.rejectedBadgeText}>Rejected</Text>
            </View>
          )}
        </View>

        <View style={styles.taskInfo}>
          <MaterialCommunityIcons name="format-list-checks" size={16} color="#007AFF" />
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.taskTitle}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="star" size={14} color="#e67700" />
            <Text style={styles.detailText}>{item.taskPoints} pts</Text>
          </View>
          
          {item.dueDate && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar" size={14} color="#6c757d" />
              <Text style={styles.detailText}>
                Due: {item.dueDate.toLocaleDateString()}
              </Text>
            </View>
          )}

          {item.timeSlot && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="clock" size={14} color="#6c757d" />
              <Text style={styles.detailText}>
                {item.timeSlot.startTime} - {item.timeSlot.endTime}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.evidenceRow}>
          {item.photoUrl ? (
            <View style={styles.hasPhotoBadge}>
              <MaterialCommunityIcons name="image" size={14} color="#007AFF" />
              <Text style={styles.hasPhotoText}>Has Photo</Text>
            </View>
          ) : (
            <View style={styles.noPhotoBadge}>
              <MaterialCommunityIcons name="image-off" size={14} color="#868e96" />
              <Text style={styles.noPhotoText}>No Photo</Text>
            </View>
          )}
          
          {item.notes ? (
            <View style={styles.hasNotesBadge}>
              <MaterialCommunityIcons name="note-text" size={14} color="#e67700" />
              <Text style={styles.hasNotesText}>Has Notes</Text>
            </View>
          ) : null}
        </View>

        {/* ONLY SHOW QUICK ACTIONS FOR SUBMITTED ASSIGNMENTS IN PENDING FILTER */}
        {isPending && isSubmitted && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickRejectButton}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickReject(item.id, item.taskTitle);
              }}
            >
              <MaterialCommunityIcons name="close" size={16} color="#fa5252" />
              <Text style={styles.quickRejectText}>Reject</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickApproveButton}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickApprove(item.id, item.taskTitle);
              }}
            >
              <MaterialCommunityIcons name="check" size={16} color="#2b8a3e" />
              <Text style={styles.quickApproveText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.adminNotes && (
          <View style={styles.adminNotesPreview}>
            <MaterialCommunityIcons name="message-text" size={14} color="#6c757d" />
            <Text style={styles.adminNotesText} numberOfLines={1}>
              {item.adminNotes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Review Submissions
        </Text>
        <Text style={styles.subtitle}>
          {groupName || 'Group'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={() => {
          fetchSubmissions();
          fetchStats();
        }}
      >
        <MaterialCommunityIcons name="refresh" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {renderStatsBar()}
      {renderFilterTabs()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchSubmissions()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={submissions}
          renderItem={renderSubmissionItem}
          keyExtractor={(item) => item.id || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                fetchSubmissions(true);
                fetchStats();
              }}
              colors={['#007AFF']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name={
                  filter === 'pending' ? 'clock-check-outline' : 
                  filter === 'verified' ? 'check-circle-outline' : 
                  'close-circle-outline'
                } 
                size={64} 
                color="#dee2e6" 
              />
              <Text style={styles.emptyText}>
                {filter === 'pending' ? 'No pending submissions' : 
                 filter === 'verified' ? 'No verified submissions' : 
                 'No rejected submissions'}
              </Text>
              <Text style={styles.emptySubtext}>
                {filter === 'pending' 
                  ? 'When members submit assignments, they will appear here'
                  : 'No submissions in this category'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
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
    borderBottomColor: '#e9ecef',
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '400'
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
    textAlign: 'center'
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef'
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexWrap: 'wrap',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#f8f9fa',
    gap: 4,
  },
  activeFilterTab: {
    backgroundColor: '#e7f5ff'
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#868e96'
  },
  activeFilterText: {
    color: '#007AFF'
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20
  },
  submissionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2
  },
  submissionTime: {
    fontSize: 12,
    color: '#6c757d'
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pendingBadgeText: {
    fontSize: 12,
    color: '#e67700',
    fontWeight: '600'
  },
  notSubmittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  notSubmittedBadgeText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '600'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d3f9d8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#2b8a3e',
    fontWeight: '600'
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffc9c9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  rejectedBadgeText: {
    fontSize: 12,
    color: '#fa5252',
    fontWeight: '600'
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    flex: 1
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontSize: 13,
    color: '#495057'
  },
  evidenceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5'
  },
  hasPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasPhotoText: {
    fontSize: 12,
    color: '#007AFF'
  },
  noPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  noPhotoText: {
    fontSize: 12,
    color: '#868e96'
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasNotesText: {
    fontSize: 12,
    color: '#e67700'
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5'
  },
  quickRejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
    gap: 6
  },
  quickRejectText: {
    color: '#fa5252',
    fontSize: 14,
    fontWeight: '600'
  },
  quickApproveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#d3f9d8',
    gap: 6
  },
  quickApproveText: {
    color: '#2b8a3e',
    fontSize: 14,
    fontWeight: '600'
  },
  adminNotesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6
  },
  adminNotesText: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
    fontStyle: 'italic'
  }
});