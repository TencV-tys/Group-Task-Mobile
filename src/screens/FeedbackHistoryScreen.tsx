import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeedback } from '../feedbackHook/useFeedback';

export default function FeedbackHistoryScreen({ navigation, route }: any) {
  const [filter, setFilterState] = useState<'OPEN' | 'RESOLVED' | null>(route.params?.filter || null);
  
  const {
    loading,
    feedbackList,
    stats,
    activeFilter,
    loadFeedback,
    loadStats,
    setFilter,
    deleteFeedback
  } = useFeedback();

  useEffect(() => {
    loadStats();
    if (filter) {
      setFilter(filter);
    }
    loadFeedback(1, filter);
  }, []);

  useEffect(() => {
    loadFeedback(1, filter);
  }, [filter]);

  const handleFilterPress = () => {
    Alert.alert(
      'Filter Feedback',
      'Select filter option',
      [
        { 
          text: 'All', 
          onPress: () => {
            setFilterState(null);
            setFilter(null);
          }
        },
        { 
          text: 'Open', 
          onPress: () => {
            setFilterState('OPEN');
            setFilter('OPEN');
          }
        },
        { 
          text: 'Resolved', 
          onPress: () => {
            setFilterState('RESOLVED');
            setFilter('RESOLVED');
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleDelete = (feedbackId: string) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const deleted = await deleteFeedback(feedbackId);
            if (deleted) {
              loadFeedback(1, filter);
              loadStats();
            }
          }
        }
      ]
    );
  };

  const getHeaderTitle = () => {
    if (!filter) return 'All Feedback';
    return filter === 'OPEN' ? 'Open Feedback' : 'Resolved Feedback';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{getHeaderTitle()}</Text>
          <Text style={styles.subtitle}>History</Text>
        </View>
        
        <View style={styles.headerRight}>
          {/* Filter Button */}
          <TouchableOpacity 
            onPress={handleFilterPress}
            style={[styles.iconButton, filter && styles.activeFilterButton]}
          >
            <MaterialCommunityIcons 
              name="filter" 
              size={22} 
              color={filter ? '#007AFF' : '#6c757d'} 
            />
          </TouchableOpacity>

          {/* Refresh Button */}
          <TouchableOpacity 
            onPress={() => loadFeedback(1, filter)}
            disabled={loading}
            style={styles.iconButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={22} color="#007AFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{stats.open || 0}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#34C759' }]}>{stats.resolved || 0}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => loadFeedback(1, filter)} />
        }
        contentContainerStyle={styles.content}
      >
        {feedbackList.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="message-text-outline" size={64} color="#dee2e6" />
            <Text style={styles.emptyStateText}>No feedback yet</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter 
                ? `No ${filter.toLowerCase()} feedback found` 
                : 'Your submitted feedback will appear here'}
            </Text>
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={() => navigation.navigate('Feedback')}
            >
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </TouchableOpacity>
          </View>
        ) : (
          feedbackList.map((item) => (
            <View key={item.id} style={styles.feedbackCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.typeContainer}>
                  <MaterialCommunityIcons 
                    name={getFeedbackIcon(item.type) as any} 
                    size={20} 
                    color={getFeedbackColor(item.type)} 
                  />
                  <Text style={styles.typeText}>{item.type.replace('_', ' ')}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>

              {/* Message - Clickable for details */}
              <TouchableOpacity 
                onPress={() => navigation.navigate('FeedbackDetails', { feedbackId: item.id })}
                activeOpacity={0.7}
              >
                <Text style={styles.message} numberOfLines={2}>
                  {item.message}
                </Text>
              </TouchableOpacity>

              {/* Footer with actions */}
              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
                  {item.category && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                  )}
                  <Text style={styles.date}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.actions}>
                  {/* Edit - Only if editable */}
                  {item.status !== 'RESOLVED' && item.status !== 'CLOSED' && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('FeedbackDetails', { 
                        feedbackId: item.id,
                        editMode: true 
                      })}
                      style={styles.actionButton}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#007AFF" />
                    </TouchableOpacity>
                  )}
                  
                  {/* Delete */}
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons name="delete" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
const getFeedbackIcon = (type: string) => {
  const icons: Record<string, string> = {
    'BUG': 'bug',
    'FEATURE_REQUEST': 'lightbulb',
    'GENERAL': 'message',
    'SUGGESTION': 'lightbulb-outline',
    'COMPLAINT': 'alert-circle',
    'QUESTION': 'help-circle',
    'OTHER': 'dots-horizontal'
  };
  return icons[type] || 'message';
};

const getFeedbackColor = (type: string) => {
  const colors: Record<string, string> = {
    'BUG': '#FF3B30',
    'FEATURE_REQUEST': '#FF9500',
    'GENERAL': '#007AFF',
    'SUGGESTION': '#5856D6',
    'COMPLAINT': '#FF3B30',
    'QUESTION': '#34C759',
    'OTHER': '#8E8E93'
  };
  return colors[type] || '#007AFF';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'OPEN': '#FF9500',
    'IN_PROGRESS': '#007AFF',
    'RESOLVED': '#34C759',
    'CLOSED': '#8E8E93'
  };
  return colors[status] || '#8E8E93';
};

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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  activeFilterButton: {
    backgroundColor: '#e7f5ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e9ecef',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryTag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    color: '#495057',
  },
  date: {
    fontSize: 11,
    color: '#adb5bd',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
});