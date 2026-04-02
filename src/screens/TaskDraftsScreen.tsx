// screens/TaskDraftsScreen.tsx - FIXED

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

export default function TaskDraftsScreen({ navigation, route }: any) {
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
      
      // ✅ If no drafts and we're in a group, navigate to CreateTask screen
      if (draftsList.length === 0 && groupId) {
        console.log('🚀 No drafts found, redirecting to CreateTask screen');
        navigation.replace('CreateTask', {
          groupId,
          groupName,
          onTaskCreated: () => {
            // After task is created, go back to GroupTasks
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
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.draftCard}
      >
        <View style={styles.draftHeader}>
          <View style={styles.draftTitleContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#2b8a3e" />
            <Text style={styles.draftTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <View style={styles.draftBadge}>
            <Text style={styles.draftBadgeText}>
              {item.executionFrequency === 'DAILY' ? 'Daily' : 'Weekly'}
            </Text>
          </View>
        </View>

        <View style={styles.draftDetails}>
          <View style={styles.draftDetail}>
            <MaterialCommunityIcons name="star" size={14} color="#e67700" />
            <Text style={styles.draftDetailText}>{item.points} pts</Text>
          </View>
          
          {item.selectedDays && item.selectedDays.length > 0 && (
            <View style={styles.draftDetail}>
              <MaterialCommunityIcons name="calendar" size={14} color="#868e96" />
              <Text style={styles.draftDetailText}>
                {item.selectedDays.slice(0, 3).join(', ')}
                {item.selectedDays.length > 3 && ` +${item.selectedDays.length - 3}`}
              </Text>
            </View>
          )}

          <View style={styles.draftDetail}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#868e96" />
            <Text style={styles.draftDetailText}>
              {item.timeSlots.length} time slot{item.timeSlots.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.draftFooter}>
          <Text style={styles.draftDate}>
            Last updated: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteDraft(item.id);
            }}
          >
            <MaterialCommunityIcons name="delete" size={18} color="#fa5252" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // ✅ Show loading screen while checking drafts
  if (loading) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Checking drafts...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // This will only show if there are drafts (since we redirect when no drafts)
  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {groupId ? `${groupName} Drafts` : 'My Drafts'}
        </Text>
        <TouchableOpacity onPress={() => loadDrafts()} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
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
            colors={['#2b8a3e']}
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
    backgroundColor: '#f8f9fa',
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
    flex: 1,
    textAlign: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
  },
  listContainer: {
    padding: 16,
  },
  draftCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
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
    color: '#212529',
    flex: 1,
  },
  draftBadge: {
    backgroundColor: '#e7f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    fontSize: 10,
    color: '#2b8a3e',
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
    color: '#495057',
  },
  draftFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  draftDate: {
    fontSize: 11,
    color: '#868e96',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
});