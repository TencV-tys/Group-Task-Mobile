import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskService } from '../taskServices/TaskService';
import { GroupMembersService } from '../groupMemberServices/GroupMemberService';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  userRole: string;
  navigation: any;
  onNavigateToAssignment?: () => void;
  onRefreshTasks?: () => void;
  onCreateTask?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  groupId,
  groupName,
  userRole,
  navigation,
  onNavigateToAssignment,
  onRefreshTasks,
  onCreateTask
}) => {
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [groupStats, setGroupStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rotationWeek, setRotationWeek] = useState<number>(1);

  const isAdmin = userRole === 'ADMIN';

  const loadGroupData = async () => {
    if (!visible) return;

    try {
      setLoadingStats(true);
      const statsResult = await TaskService.getTaskStatistics(groupId);
      if (statsResult.success) {
        setGroupStats(statsResult.statistics); 
      }

      const groupResult = await GroupMembersService.getGroupInfo(groupId);
      if (groupResult.success) {
        setRotationWeek(groupResult.group?.currentRotationWeek || 1);
      }

      setLoadingLeaderboard(true);
      const leaderboardResult = await getLeaderboardData(groupId);
      setLeaderboard(leaderboardResult);

    } catch (error) {
      console.error('Error loading group data:', error);
    } finally {
      setLoadingStats(false);
      setLoadingLeaderboard(false);
    }
  };

  const getLeaderboardData = async (groupId: string) => {
    return [
      { userId: '1', userName: 'John Doe', points: 45, completedTasks: 12 },
      { userId: '2', userName: 'Jane Smith', points: 38, completedTasks: 10 },
      { userId: '3', userName: 'Bob Johnson', points: 28, completedTasks: 8 },
      { userId: '4', userName: 'Alice Brown', points: 22, completedTasks: 6 },
    ];
  };

  const handleRotateTasks = async () => {
    Alert.alert(
      'Rotate Tasks',
      'Are you sure you want to rotate tasks to the next week? This will reassign all recurring tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await TaskService.rotateTasks(groupId);
              if (result.success) {
                Alert.alert('Success', `Tasks rotated to week ${result.newWeek}`);
                onRefreshTasks?.();
                loadGroupData();
              } else { 
                Alert.alert('Error', result.message || 'Failed to rotate tasks');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to rotate tasks');
            }
          }
        }
      ]
    );
  };

  const handleViewRotationSchedule = () => {
    navigation.navigate('RotationSchedule', { groupId, groupName });
    onClose();
  };

  const handleViewAssignment = () => {
    onNavigateToAssignment?.();
    onClose();
  };

  const handleViewMembers = () => {
    navigation.navigate('GroupMembers', { groupId, groupName, userRole });
    onClose();
  };

  const handleTaskStatistics = () => {
    onClose();
  };

  const handleGroupSettings = () => {
    navigation.navigate('GroupSettings', { groupId, groupName, userRole });
    onClose();
  };

  const handleCreateTask = () => {
    if (!isAdmin) {
      Alert.alert('Restricted', 'Only admins can create tasks');
      onClose();
      return;
    }
    
    onCreateTask?.();
    onClose();
  };

  useEffect(() => {
    if (visible) {
      loadGroupData();
    }
  }, [visible]);

  const renderLeaderboardItem = (item: any, index: number) => {
    const isFirst = index === 0;
    const isSecond = index === 1;
    const isThird = index === 2;

    return (
      <View key={item.userId} style={[
        styles.leaderboardItem,
        isFirst && styles.firstPlace,
        isSecond && styles.secondPlace,
        isThird && styles.thirdPlace
      ]}>
        <View style={styles.leaderboardRank}>
          {isFirst ? (
            <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
          ) : isSecond ? (
            <MaterialCommunityIcons name="trophy" size={18} color="#C0C0C0" />
          ) : isThird ? (
            <MaterialCommunityIcons name="trophy" size={16} color="#CD7F32" />
          ) : (
            <Text style={styles.rankNumber}>{index + 1}</Text>
          )}
        </View>
        
        <View style={styles.leaderboardUser}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>
              {item.userName?.charAt(0) || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.userName}
            </Text>
            <Text style={styles.userStats}>
              {item.completedTasks} tasks • {item.points} pts
            </Text>
          </View>
        </View>
        
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{item.points}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {groupName} Settings
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {isAdmin && (
              <View style={styles.section}>
                <TouchableOpacity 
                  style={styles.createTaskButton}
                  onPress={handleCreateTask}
                >
                  <MaterialCommunityIcons name="plus-circle" size={24} color="#fff" />
                  <Text style={styles.createTaskButtonText}>Create New Task</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="calendar-sync" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Rotation</Text>
              </View>
              
              <View style={styles.rotationCard}>
                <View style={styles.rotationInfo}>
                  <Text style={styles.rotationLabel}>Current Week</Text>
                  <Text style={styles.rotationValue}>Week {rotationWeek}</Text>
                </View>
                
                {isAdmin && (
                  <TouchableOpacity 
                    style={styles.rotateButton}
                    onPress={handleRotateTasks}
                  >
                    <MaterialCommunityIcons name="rotate-right" size={16} color="#fff" />
                    <Text style={styles.rotateButtonText}>Rotate Tasks</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleViewRotationSchedule}
              >
                <MaterialCommunityIcons name="calendar-clock" size={18} color="#007AFF" />
                <Text style={styles.actionButtonText}>View Rotation Schedule</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {isAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="shield-account" size={20} color="#007AFF" />
                  <Text style={styles.sectionTitle}>Admin Actions</Text>
                </View>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleViewAssignment}
                >
                  <MaterialCommunityIcons name="account-switch" size={18} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Manage Assignments</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleViewMembers}
                >
                  <MaterialCommunityIcons name="account-group" size={18} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Manage Members</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleGroupSettings}
                >
                  <MaterialCommunityIcons name="cog" size={18} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Group Settings</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="chart-bar" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Statistics</Text>
              </View>

              {loadingStats ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : groupStats ? (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.totalTasks || 0}
                    </Text>
                    <Text style={styles.statLabel}>Total Tasks</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.currentWeek?.totalAssignments || 0}
                    </Text>
                    <Text style={styles.statLabel}>This Week</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.recurringTasks || 0}
                    </Text>
                    <Text style={styles.statLabel}>Recurring</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {groupStats.currentWeek?.completedPoints || 0}
                    </Text>
                    <Text style={styles.statLabel}>Points Earned</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noDataText}>No statistics available</Text>
              )}

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleTaskStatistics}
              >
                <MaterialCommunityIcons name="chart-box" size={18} color="#007AFF" />
                <Text style={styles.actionButtonText}>View Detailed Statistics</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="podium" size={20} color="#007AFF" />
                <Text style={styles.sectionTitle}>Leaderboard</Text>
              </View>

              {loadingLeaderboard ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : leaderboard.length > 0 ? (
                <View style={styles.leaderboardContainer}>
                  {leaderboard.slice(0, 5).map((item, index) => 
                    renderLeaderboardItem(item, index)
                  )}
                </View>
              ) : (
                <Text style={styles.noDataText}>No leaderboard data yet</Text>
              )}

              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View Full Leaderboard</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              Group ID: {groupId.substring(0, 8)}...
            </Text>
            <Text style={styles.footerRole}>
              {isAdmin ? 'Group Admin' : 'Member'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  modalBody: {
    padding: 20
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f8f9fa'
  },
  footerText: {
    fontSize: 12,
    color: '#666'
  },
  footerRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600'
  },
  section: {
    marginBottom: 24
  },
  createTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16
  },
  createTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000'
  },
  rotationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  rotationInfo: {
    flex: 1
  },
  rotationLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  rotationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000'
  },
  rotateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  rotateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  actionButtonText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    marginHorizontal: 12
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic'
  },
  leaderboardContainer: {
    marginBottom: 16
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  firstPlace: {
    backgroundColor: '#fff3bf',
    borderColor: '#ffd43b'
  },
  secondPlace: {
    backgroundColor: '#f1f3f5',
    borderColor: '#dee2e6'
  },
  thirdPlace: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef'
  },
  leaderboardRank: {
    width: 32,
    alignItems: 'center'
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
  leaderboardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  userInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  userInfo: {
    flex: 1 
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2
  },
  userStats: {
    fontSize: 12,
    color: '#666'
  },
  pointsBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  pointsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  viewAllButton: {
    backgroundColor: '#e7f5ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a5d8ff'
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14
  }
});