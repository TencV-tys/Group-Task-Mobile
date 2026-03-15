// src/screens/PendingVerificationsScreen.tsx - UPDATED with TokenUtils
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AssignmentService } from '../services/AssignmentService';
import { TokenUtils } from '../utils/tokenUtils'; // 👈 ADD THIS IMPORT
import { ScreenWrapper } from '../components/ScreenWrapper';

export default function PendingVerificationsScreen({ navigation, route }: any) {
  const { groupId, groupName, userRole } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [stats, setStats] = useState<any>(null);
  
  const isAdmin = userRole === 'ADMIN';

  // ===== AUTH ERROR HANDLER =====
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

  // ===== CHECK ADMIN ACCESS =====
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
    // Check token first
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

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
    // Check token first
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefreshing) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    
    try {
      console.log(`Fetching ${filter} submissions for group:`, groupId);
      
      let statusParam: string | undefined;
      if (filter === 'pending') {
        statusParam = 'submitted';
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
    // Check token first
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

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
                setSubmissions(prev => prev.filter(item => item.id !== assignmentId));
                fetchStats();
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
    // Check token first
    const hasToken = await TokenUtils.checkToken({
      showAlert: false,
      onAuthError: () => setAuthError(true)
    });
    
    if (!hasToken) return;

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
                setSubmissions(prev => prev.filter(item => item.id !== assignmentId));
                fetchStats();
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
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsBar}
      >
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
      </LinearGradient>
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
          color={filter === 'pending' ? '#2b8a3e' : '#868e96'} 
        />
        <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
          Pending
        </Text>
        {filter === 'pending' && stats?.pendingVerification > 0 && (
          <LinearGradient
            colors={['#2b8a3e', '#1e6b2c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{stats.pendingVerification}</Text>
          </LinearGradient>
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
    const isSubmitted = item.completed === true && item.verified === null;
    
    return (
      <TouchableOpacity
        style={styles.submissionCard}
        onPress={() => handleViewSubmission(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              {item.userAvatar ? (
                <Image source={{ uri: item.userAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {item.userName?.charAt(0) || 'U'}
                </Text>
              )}
            </LinearGradient>
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
            <LinearGradient
              colors={['#d3f9d8', '#b2f2bb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pendingBadge}
            >
              <MaterialCommunityIcons name="clock" size={12} color="#2b8a3e" />
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </LinearGradient>
          )}
          {filter === 'verified' && (
            <LinearGradient
              colors={['#d3f9d8', '#b2f2bb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifiedBadge}
            >
              <MaterialCommunityIcons name="check-circle" size={12} color="#2b8a3e" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </LinearGradient>
          )}
          {filter === 'rejected' && (
            <LinearGradient
              colors={['#fff5f5', '#ffe3e3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rejectedBadge}
            >
              <MaterialCommunityIcons name="close-circle" size={12} color="#fa5252" />
              <Text style={styles.rejectedBadgeText}>Rejected</Text>
            </LinearGradient>
          )}
        </View>

        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.taskInfo}
        >
          <MaterialCommunityIcons name="format-list-checks" size={16} color="#495057" />
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.taskTitle}
          </Text>
        </LinearGradient>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="star" size={14} color="#e67700" />
            <Text style={styles.detailText}>{item.taskPoints} pts</Text>
          </View>
          
          {item.dueDate && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar" size={14} color="#868e96" />
              <Text style={styles.detailText}>
                {item.dueDate.toLocaleDateString()}
              </Text>
            </View>
          )}

          {item.timeSlot && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="clock" size={14} color="#868e96" />
              <Text style={styles.detailText}>
                {item.timeSlot.startTime} - {item.timeSlot.endTime}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.evidenceRow}>
          {item.photoUrl ? (
            <LinearGradient
              colors={['#e7f5ff', '#d0ebff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hasPhotoBadge}
            >
              <MaterialCommunityIcons name="image" size={14} color="#2b8a3e" />
              <Text style={styles.hasPhotoText}>Photo</Text>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.noPhotoBadge}
            >
              <MaterialCommunityIcons name="image-off" size={14} color="#868e96" />
              <Text style={styles.noPhotoText}>No Photo</Text>
            </LinearGradient>
          )}
          
          {item.notes ? (
            <LinearGradient
              colors={['#fff3bf', '#ffec99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hasNotesBadge}
            >
              <MaterialCommunityIcons name="note-text" size={14} color="#e67700" />
              <Text style={styles.hasNotesText}>Notes</Text>
            </LinearGradient>
          ) : null}
        </View>

        {isPending && isSubmitted && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickRejectButton}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickReject(item.id, item.taskTitle);
              }}
            >
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="close" size={14} color="#fa5252" />
                <Text style={styles.quickRejectText}>Reject</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickApproveButton}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickApprove(item.id, item.taskTitle);
              }}
            >
              <LinearGradient
                colors={['#d3f9d8', '#b2f2bb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="check" size={14} color="#2b8a3e" />
                <Text style={styles.quickApproveText}>Approve</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {item.adminNotes && (
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.adminNotesPreview}
          >
            <MaterialCommunityIcons name="message-text" size={14} color="#868e96" />
            <Text style={styles.adminNotesText} numberOfLines={1}>
              {item.adminNotes}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#ffffff', '#f8f9fa']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
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
        <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
      </TouchableOpacity>
    </LinearGradient>
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {renderStatsBar()}
      {renderFilterTabs()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#fa5252" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchSubmissions()}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
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
              colors={['#2b8a3e']}
              tintColor="#2b8a3e"
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
    </ScreenWrapper>
  );
}

// Styles remain exactly the same as your original
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
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    minHeight: 56,
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 2,
    textAlign: 'center'
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
  statsBar: {
    flexDirection: 'row',
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
    color: '#868e96'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef'
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#2b8a3e',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#868e96'
  },
  activeFilterText: {
    color: '#2b8a3e'
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4
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
    color: '#868e96',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#fa5252',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12
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
    fontSize: 16,
    color: '#868e96',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 20
  },
  submissionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2
  },
  submissionTime: {
    fontSize: 12,
    color: '#868e96'
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '600'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '600'
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  rejectedBadgeText: {
    fontSize: 11,
    color: '#fa5252',
    fontWeight: '600'
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    flex: 1,
    lineHeight: 20
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
    gap: 4,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasPhotoText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '500'
  },
  noPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  noPhotoText: {
    fontSize: 11,
    color: '#868e96',
    fontWeight: '500'
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  hasNotesText: {
    fontSize: 11,
    color: '#e67700',
    fontWeight: '500'
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5'
  },
  quickRejectButton: {
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
  },
  quickApproveButton: {
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  quickRejectText: {
    color: '#fa5252',
    fontSize: 13,
    fontWeight: '600'
  },
  quickApproveText: {
    color: '#2b8a3e',
    fontSize: 13,
    fontWeight: '600'
  },
  adminNotesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  adminNotesText: {
    fontSize: 12,
    color: '#868e96',
    flex: 1,
    fontStyle: 'italic'
  }
});