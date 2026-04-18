// src/screens/MyGroupsScreen.tsx - Dark Mode Added
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMyGroups } from '../groupHook/useMyGroups';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { ReportModal } from '../components/ReportModal';
import { ReportService } from '../services/ReportService';
import { useTheme } from '../context/ThemeContext';

export default function MyGroupsScreen({ navigation }: any) {
  const { theme, isDark } = useTheme();
  const { 
    groups, 
    loading, 
    refreshing, 
    error, 
    fetchGroups, 
    refreshGroups,  
    addGroup,
    updateGroupAvatar,
    authError
  } = useMyGroups();

  const [searchQuery, setSearchQuery] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedGroupForReport, setSelectedGroupForReport] = useState<any>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [authError, navigation]);

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup', {
      onGroupCreated: (newGroup: any) => {
        addGroup({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          avatarUrl: newGroup.avatarUrl,
          inviteCode: newGroup.inviteCode,
          createdAt: newGroup.createdAt,
          createdById: newGroup.createdById,
          userRole: 'ADMIN',
          memberCount: 1,
          taskCount: 0
        });
        Alert.alert('Success!', 'Group created successfully');
      }
    });
  };

  const handleJoinGroup = () => {
    navigation.navigate('JoinGroup', {
      onGroupJoined: (newGroup: any) => {
        addGroup({
          id: newGroup.id,
          name: newGroup.name,
          description: newGroup.description,
          avatarUrl: newGroup.avatarUrl,
          inviteCode: newGroup.inviteCode,
          createdAt: newGroup.createdAt,
          createdById: newGroup.createdById,
          userRole: 'MEMBER',
          memberCount: newGroup.memberCount || 1,
          taskCount: newGroup.taskCount || 0
        });
        Alert.alert('Success!', 'Joined group successfully');
      }
    });
  };

  const handleGroupPress = (group: any) => {
    navigation.navigate('GroupTasks', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER'
    });
  };

  const handleManageGroup = (group: any) => {
    navigation.navigate('GroupMembers', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER',
      inviteCode: group.inviteCode
    });
  };

  const handleInviteGroup = (group: any) => {
    Alert.alert(
      'Invite Code',
      `Share this code to invite members:\n\n📋 ${group.inviteCode || 'No invite code available'}`,
      [
        { text: 'Copy', onPress: () => {/* Copy to clipboard */} }, 
        { text: 'Share', onPress: () => handleShareInvite(group) },
        { text: 'OK' }
      ]
    );
  };

  const handleShareInvite = (group: any) => {
    const code = group.inviteCode;
    if (!code) {
      Alert.alert('Error', 'No invite code available');
      return;
    }

    Share.share({
      message: `Join my group "${group.name}" on Group Task! Use invite code: ${code}`,
      title: `Join ${group.name}`
    }).catch((err:any) => console.error('Error sharing:', err));
  };

  const handleTasksGroup = (group: any) => {
    navigation.navigate('GroupTasks', { 
      groupId: group.id,
      groupName: group.name,
      userRole: group.userRole || group.role || 'MEMBER'
    });
  };

  const handleReportGroup = (group: any) => {
    setSelectedGroupForReport(group);
    setReportModalVisible(true);
  };

  const handleSubmitReport = async (data: { type: string; description: string }) => {
    if (!selectedGroupForReport) return;
    
    await ReportService.submitGroupReport(selectedGroupForReport.id, data);
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupIcon = (group: any, isAdmin: boolean) => {
    if (group.avatarUrl) {
      return (
        <View style={styles.groupIconContainer}>
          <Image
            source={{ uri: group.avatarUrl }}
            style={[
              styles.groupIcon,
              styles.groupAvatarImage,
              { borderColor: isAdmin ? theme.primary : theme.border }
            ]}
          />
          {isAdmin && (
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.adminBadge}
            >
              <MaterialCommunityIcons name="crown" size={10} color="#fff" />
            </LinearGradient>
          )}
        </View>
      );
    } else {
      const groupName = group.name || 'Unnamed Group';
      return (
        <View style={styles.groupIconContainer}>
          <LinearGradient
            colors={isAdmin ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.groupIcon,
              { borderWidth: 1, borderColor: isAdmin ? theme.primary : theme.border }
            ]}
          >
            <Text style={[
              styles.groupIconText,
              { color: isAdmin ? '#fff' : theme.textSecondary }
            ]}>
              {groupName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          {isAdmin && (
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.adminBadge}
            >
              <MaterialCommunityIcons name="crown" size={10} color="#fff" />
            </LinearGradient>
          )}
        </View>
      );
    }
  };

  const renderGroup = ({ item }: any) => {
    const groupName = item.name || 'Unnamed Group';
    const userRole = item.userRole || item.role || 'MEMBER';
    const isAdmin = userRole === 'ADMIN';
    
    return (
      <TouchableOpacity 
        style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}
        onPress={() => handleGroupPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.groupHeader}>
          {renderGroupIcon(item, isAdmin)}
          
          <View style={styles.groupMainInfo}>
            <View style={styles.groupTitleRow}>
              <Text style={[styles.groupName, { color: theme.text }]} numberOfLines={1}>{groupName}</Text>
              <LinearGradient
                colors={isAdmin ? [theme.primaryLight, theme.primaryLight] : [theme.bgSecondary, theme.bgTertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.roleBadge}
              > 
                <Text style={[
                  styles.groupRole,
                  isAdmin && styles.adminRoleText,
                  { color: isAdmin ? theme.primary : theme.textSecondary }
                ]}>
                  {isAdmin ? 'Admin' : 'Member'}
                </Text>
              </LinearGradient>
            </View>
            
            {item.description ? (
              <Text style={[styles.groupDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : (
              <Text style={[styles.groupNoDescription, { color: theme.textPlaceholder }]}>No description</Text>
            )}
            
            <View style={styles.groupQuickStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="account-group" size={14} color={theme.textMuted} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>{item.memberCount || 1}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clipboard-check" size={14} color={theme.textMuted} />
                <Text style={[styles.statText, { color: theme.textSecondary }]}>{item.taskCount || 0}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={[styles.groupActions, { borderTopColor: theme.borderLight }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.bgSecondary }]}
            onPress={(e) => {
              e.stopPropagation();
              handleInviteGroup(item);
            }}
          >
            <MaterialCommunityIcons name="account-plus" size={16} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Invite</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.bgSecondary }]}
            onPress={(e) => {
              e.stopPropagation();
              handleTasksGroup(item);
            }}
          >
            <MaterialCommunityIcons name="clipboard-text" size={16} color={theme.textSecondary} />
            <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Tasks</Text>
          </TouchableOpacity>
          
          {isAdmin && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.bgSecondary }]}
              onPress={(e) => {
                e.stopPropagation();
                handleManageGroup(item);
              }}
            >
              <MaterialCommunityIcons name="cog" size={16} color={theme.textSecondary} />
              <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Manage</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.actionButton, styles.reportButton, { backgroundColor: theme.errorBg }]}
            onPress={(e) => {
              e.stopPropagation();
              handleReportGroup(item);
            }}
          >
            <MaterialCommunityIcons name="flag" size={16} color={theme.error} />
            <Text style={[styles.actionButtonText, styles.reportButtonText, { color: theme.error }]}>Report</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading your groups...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.bgSecondary }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={60} color={theme.error} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Error Loading Groups</Text>
          <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>{error}</Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => fetchGroups()}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshGroups}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.listHeaderTitle, { color: theme.text }]}>
              {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
            </Text>
            {searchQuery ? (
              <Text style={[styles.listHeaderSubtitle, { color: theme.textMuted }]}>
                Showing {filteredGroups.length} result{filteredGroups.length !== 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="account-group" size={60} color={theme.border} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Groups Yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
              Create your first group to organize tasks with friends or family
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleCreateGroup}
              >
                <LinearGradient
                  colors={[theme.primary, theme.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButtonGradient}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Create Group</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleJoinGroup}
              >
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.secondaryButtonGradient}
                >
                  <MaterialCommunityIcons name="login" size={18} color={theme.textSecondary} />
                  <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Join Group</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>My Groups</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={refreshGroups}
          disabled={refreshing}
          style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={22} color={theme.textMuted} />
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick Actions Bar */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleCreateGroup}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionGradient}
          >
            <MaterialCommunityIcons name="plus-circle" size={18} color="#fff" />
            <Text style={styles.quickActionText}>Create</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleJoinGroup}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionGradient}
          >
            <MaterialCommunityIcons name="login" size={18} color={theme.textSecondary} />
            <Text style={[styles.quickActionText, styles.joinActionText, { color: theme.textSecondary }]}>Join</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {renderContent()}

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setSelectedGroupForReport(null);
        }}
        groupId={selectedGroupForReport?.id}
        groupName={selectedGroupForReport?.name}
        onSubmit={handleSubmitReport}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  quickAction: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  joinActionText: {},
  // Group List
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listHeaderSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  // Group Card
  groupCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  groupIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarImage: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  adminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  groupMainInfo: {
    flex: 1,
  },
  groupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupRole: {
    fontSize: 11,
    fontWeight: '500',
  },
  adminRoleText: {},
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  groupNoDescription: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  groupQuickStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  groupActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reportButton: {},
  reportButtonText: {},
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 140,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 140,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});