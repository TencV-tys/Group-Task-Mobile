// src/screens/FeedbackHistoryScreen.tsx - UPDATED with IN_PROGRESS filter
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeedback } from '../feedbackHook/useFeedback';
import { ScreenWrapper } from '../components/ScreenWrapper';
export default function FeedbackHistoryScreen({ navigation, route }: any) {
  const [filter, setFilterState] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | null>(route.params?.filter || null);
  
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
        text: 'In Progress', 
        onPress: () => {
          setFilterState('IN_PROGRESS');
          setFilter('IN_PROGRESS');
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
    switch (filter) {
      case 'OPEN': return 'Open Feedback';
      case 'IN_PROGRESS': return 'In Progress Feedback';
      case 'RESOLVED': return 'Resolved Feedback';
      default: return 'All Feedback';
    }
  };

  // Update stats to include IN_PROGRESS if available
  const getStatCount = (status: string) => {
    if (!stats) return 0;
    
    if (status === 'OPEN') return stats.open || 0;
    if (status === 'IN_PROGRESS') return stats.inProgress || 0;
    if (status === 'RESOLVED') return stats.resolved || 0;
    if (status === 'TOTAL') return stats.total || 0;
    return 0;
  };

  return (
    <ScreenWrapper style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
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
            <LinearGradient
              colors={filter ? ['#d3f9d8', '#b2f2bb'] : ['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconButtonGradient}
            >
              <MaterialCommunityIcons 
                name="filter" 
                size={18} 
                color={filter ? '#2b8a3e' : '#495057'} 
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Refresh Button */}
          <TouchableOpacity 
            onPress={() => loadFeedback(1, filter)}
            disabled={loading}
            style={styles.iconButton}
          >
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#2b8a3e" />
              ) : (
                <MaterialCommunityIcons name="refresh" size={18} color="#2b8a3e" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary - Updated to show IN_PROGRESS */}
      {stats && (
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsRow}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#e67700' }]}>{stats.open || 0}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2b8a3e' }]}>{stats.inProgress || 0}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2b8a3e' }]}>{stats.resolved || 0}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </LinearGradient>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={() => loadFeedback(1, filter)}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {feedbackList.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="message-text-outline" size={48} color="#2b8a3e" />
            </LinearGradient>
            <Text style={styles.emptyStateText}>No feedback yet</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter 
                ? `No ${filter === 'IN_PROGRESS' ? 'in progress' : filter.toLowerCase()} feedback found` 
                : 'Your submitted feedback will appear here'}
            </Text>
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={() => navigation.navigate('Feedback')}
            >
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <MaterialCommunityIcons name="plus" size={16} color="white" />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          feedbackList.map((item) => (
            <LinearGradient
              key={item.id}
              colors={['#ffffff', '#f8f9fa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.feedbackCard}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.typeContainer}>
                  <LinearGradient
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.typeIcon}
                  >
                    <MaterialCommunityIcons 
                      name={getFeedbackIcon(item.type) as any} 
                      size={16} 
                      color={getFeedbackColor(item.type)} 
                    />
                  </LinearGradient>
                  <Text style={styles.typeText}>{item.type.replace(/_/g, ' ')}</Text>
                </View>
                <LinearGradient
                  colors={[getStatusColor(item.status), getStatusColor(item.status) + 'dd']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statusBadge}
                >
                  <Text style={styles.statusText}>
                    {item.status === 'IN_PROGRESS' ? 'In Progress' : item.status}
                  </Text>
                </LinearGradient>
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
                    <LinearGradient
                      colors={['#f8f9fa', '#e9ecef']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.categoryTag}
                    >
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </LinearGradient>
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
                      <LinearGradient
                        colors={['#f8f9fa', '#e9ecef']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.actionButtonGradient}
                      >
                        <MaterialCommunityIcons name="pencil" size={14} color="#2b8a3e" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  {/* Delete */}
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.actionButton}
                  >
                    <LinearGradient
                      colors={['#fff5f5', '#ffe3e3']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.actionButtonGradient, styles.deleteButtonGradient]}
                    >
                      <MaterialCommunityIcons name="delete" size={14} color="#fa5252" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
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
    'BUG': '#fa5252',
    'FEATURE_REQUEST': '#e67700',
    'GENERAL': '#2b8a3e',
    'SUGGESTION': '#4F46E5',
    'COMPLAINT': '#fa5252',
    'QUESTION': '#2b8a3e',
    'OTHER': '#868e96'
  };
  return colors[type] || '#2b8a3e';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'OPEN': '#e67700',
    'IN_PROGRESS': '#2b8a3e',
    'RESOLVED': '#2b8a3e',
    'CLOSED': '#868e96'
  };
  return colors[status] || '#868e96';
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
    minHeight: 60,
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
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  subtitle: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  iconButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterButton: {
    borderColor: '#2b8a3e',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 10,
    color: '#868e96',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
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
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#868e96',
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  submitButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
  typeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
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
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryText: {
    fontSize: 10,
    color: '#495057',
  },
  date: {
    fontSize: 10,
    color: '#adb5bd',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  deleteButtonGradient: {
    borderColor: '#ffc9c9',
  },
});