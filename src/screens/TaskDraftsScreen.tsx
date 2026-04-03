// screens/TaskDraftsScreen.tsx - Dark Mode Added

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TaskDraftService, TaskDraft } from '../services/TaskDraftService';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function TaskDraftsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { groupId, groupName } = route.params || {};
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDrafts = useCallback(async () => {
    try {
      let draftsList: TaskDraft[];
      if (groupId) {
        draftsList = await TaskDraftService.getGroupDrafts(groupId);
      } else {
        draftsList = await TaskDraftService.getDrafts();
      }
      console.log('📋 Loaded drafts:', draftsList.length);
      setDrafts(draftsList);
      
      if (draftsList.length === 0 && groupId) {
        console.log('🚀 No drafts found, redirecting to CreateTask screen');
        navigation.replace('CreateTask', {
          groupId,
          groupName,
          onTaskCreated: () => {
            navigation.navigate('GroupTasks', { groupId, groupName, userRole: 'ADMIN' });
          }
        });
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, groupName, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const handleDeleteDraft = (draftId: string) => {
    Alert.alert(
      'Delete Draft',
      'Are you sure you want to delete this draft?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await TaskDraftService.deleteDraft(draftId);
            loadDrafts();
          }
        }
      ]
    );
  };

  const handleCreateFromDraft = (draft: TaskDraft) => {
    console.log('🚀 Creating from draft:', draft.title);
    navigation.navigate('CreateTask', {
      groupId: draft.groupId,
      groupName: draft.groupName,
      draftData: draft,
      createFromDraft: true
    });
  };

  const renderDraft = ({ item }: { item: TaskDraft }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleCreateFromDraft(item)}
    >
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.draftCard, { borderColor: theme.border, shadowColor: theme.shadow }]}
      >
        <View style={styles.draftHeader}>
          <View style={styles.draftTitleContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.primary} />
            <Text style={[styles.draftTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <View style={[styles.draftBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.draftBadgeText, { color: theme.primary }]}>
              {item.executionFrequency === 'DAILY' ? 'Daily' : 'Weekly'}
            </Text>
          </View>
        </View>

        <View style={styles.draftDetails}>
          <View style={styles.draftDetail}>
            <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
            <Text style={[styles.draftDetailText, { color: theme.textSecondary }]}>{item.points} pts</Text>
          </View>
          
          {item.selectedDays && item.selectedDays.length > 0 && (
            <View style={styles.draftDetail}>
              <MaterialCommunityIcons name="calendar" size={14} color={theme.textMuted} />
              <Text style={[styles.draftDetailText, { color: theme.textSecondary }]}>
                {item.selectedDays.slice(0, 3).join(', ')}
                {item.selectedDays.length > 3 && ` +${item.selectedDays.length - 3}`}
              </Text>
            </View>
          )}

          <View style={styles.draftDetail}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.draftDetailText, { color: theme.textSecondary }]}>
              {item.timeSlots.length} time slot{item.timeSlots.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.draftFooter, { borderTopColor: theme.border }]}>
          <Text style={[styles.draftDate, { color: theme.textMuted }]}>
            Last updated: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteDraft(item.id);
            }}
          >
            <MaterialCommunityIcons name="delete" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Checking drafts...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {groupId ? `${groupName} Drafts` : 'My Drafts'}
        </Text>
        <TouchableOpacity onPress={() => loadDrafts()} style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={drafts}
        renderItem={renderDraft}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDrafts();
            }}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
  },
  draftCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  draftTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  draftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  draftDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  draftDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  draftDetailText: {
    fontSize: 13,
  },
  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  draftDate: {
    fontSize: 11,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});