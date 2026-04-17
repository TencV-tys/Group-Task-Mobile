// src/screens/FeedbackHistoryScreen.tsx - FIXED for double updates

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useFeedback } from '../feedbackHook/useFeedback';
import { useSocket } from '../context/SocketContext';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

export default function FeedbackHistoryScreen({ navigation, route }: any) {
  const { theme, isDark } = useTheme();
  const { socket, isConnected } = useSocket();
  const [filter, setFilterState] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | null>(route.params?.filter || null);
  
  // ✅ Track new feedback indicator
  const [hasNewFeedback, setHasNewFeedback] = useState(false);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  
  // ✅ Debounce ref for rate limiting
  const lastAlertTimeRef = useRef(0);
  
  // ✅ Track if an action is in progress to prevent double refreshes
  const actionInProgressRef = useRef(false);
  const lastActionTimeRef = useRef(0);
  
  const {
    loading,
    feedbackList,
    stats,
    loadFeedback,
    loadStats,
    setFilter,
    deleteFeedback,
    authError
  } = useFeedback();

  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [authError, navigation]);

  // Initial load
  useEffect(() => {
    loadStats();
    if (filter) {
      setFilter(filter);
    }
    loadFeedback(1, filter);
  }, []);

  // Refresh when filter changes
  useEffect(() => {
    loadFeedback(1, filter);
  }, [filter]);

  // ✅ Reset new feedback badge when filter changes or screen is viewed
  useFocusEffect(
    useCallback(() => {
      loadFeedback(1, filter);
      loadStats();
      setHasNewFeedback(false);
      setNewFeedbackCount(0);
    }, [filter])
  );

  // ✅ Listen for real-time socket events with deduplication
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewFeedback = (data: any) => {
      // ✅ Skip if action just happened (within 1 second)
      const now = Date.now();
      if (now - lastActionTimeRef.current < 1000) {
        console.log('📢 Skipping duplicate socket event (too soon)');
        return;
      }
      
      console.log('📢 New feedback received:', data);
      loadFeedback(1, filter);
      loadStats();
      
      setHasNewFeedback(true);
      setNewFeedbackCount(prev => prev + 1);
      
      if (now - lastAlertTimeRef.current > 3000) {
        lastAlertTimeRef.current = now;
        if (filter === null || filter === 'OPEN') {
          Alert.alert(
            'New Feedback',
            `${data.userName} submitted new ${data.type} feedback`,
            [{ text: 'OK' }]
          );
        }
      }
    };

    const handleStatusChanged = (data: any) => {
      const now = Date.now();
      if (now - lastActionTimeRef.current < 1000) {
        console.log('📢 Skipping duplicate status event (too soon)');
        return;
      }
      
      console.log('📢 Feedback status changed:', data);
      loadFeedback(1, filter);
      loadStats();
    };

    const handleFeedbackUpdated = (data: any) => {
      const now = Date.now();
      if (now - lastActionTimeRef.current < 1000) {
        console.log('📢 Skipping duplicate update event (too soon)');
        return;
      }
      
      console.log('📢 Feedback updated:', data);
      loadFeedback(1, filter);
      loadStats();
    };

    const handleFeedbackDeleted = (data: any) => {
      const now = Date.now();
      if (now - lastActionTimeRef.current < 1000) {
        console.log('📢 Skipping duplicate delete event (too soon)');
        return;
      }
      
      console.log('📢 Feedback deleted:', data);
      loadFeedback(1, filter);
      loadStats();
    };

    socket.on('feedback:new', handleNewFeedback);
    socket.on('feedback:status', handleStatusChanged);
    socket.on('feedback:updated', handleFeedbackUpdated);
    socket.on('feedback:deleted', handleFeedbackDeleted);

    return () => {
      socket.off('feedback:new', handleNewFeedback);
      socket.off('feedback:status', handleStatusChanged);
      socket.off('feedback:updated', handleFeedbackUpdated);
      socket.off('feedback:deleted', handleFeedbackDeleted);
    };
  }, [socket, isConnected, filter]);

  const handleStatPress = (newFilter: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | null) => {
    if (filter === newFilter) {
      setFilterState(null);
      setFilter(null);
    } else {
      setFilterState(newFilter);
      setFilter(newFilter);
    }
    setHasNewFeedback(false);
    setNewFeedbackCount(0);
  };

  const handleDelete = async (feedbackId: string) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // ✅ Set action timestamp to prevent duplicate socket handling
            lastActionTimeRef.current = Date.now();
            actionInProgressRef.current = true;
            
            const deleted = await deleteFeedback(feedbackId);
            
            if (deleted) {
              // ✅ Manually refresh (socket will also try, but our debounce will skip it)
              await loadFeedback(1, filter);
              await loadStats();
            }
            
            actionInProgressRef.current = false;
          }
        }
      ]
    );
  };

  const handleManualRefresh = () => {
    lastActionTimeRef.current = Date.now();
    loadFeedback(1, filter);
    loadStats();
    setHasNewFeedback(false);
    setNewFeedbackCount(0);
  };

  const handleCardPress = (feedbackId: string) => {
    navigation.navigate('FeedbackDetails', { feedbackId });
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

  const isActiveFilter = (status: string | null) => {
    if (status === null) return !filter;
    return filter === status;
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>{getHeaderTitle()}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>History</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={handleManualRefresh}
            disabled={loading}
            style={[styles.refreshButton, { borderColor: theme.border, backgroundColor: theme.card }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={[styles.statsRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            style={[styles.statCard, isActiveFilter(null) && styles.activeStatCard, { backgroundColor: theme.bgSecondary, borderColor: isActiveFilter(null) ? theme.primary : 'transparent' }]}
            onPress={() => handleStatPress(null)}
            activeOpacity={0.7}
          >
            <View style={styles.statContent}>
              <Text style={[styles.statValue, { color: isActiveFilter(null) ? theme.primary : theme.text }]}>{stats.total || 0}</Text>
              {hasNewFeedback && (
                <View style={[styles.newBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.newBadgeText}>{newFeedbackCount > 9 ? '9+' : newFeedbackCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.statLabel, { color: isActiveFilter(null) ? theme.primary : theme.textMuted }]}>Total</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, isActiveFilter('OPEN') && styles.activeStatCard, { backgroundColor: theme.bgSecondary, borderColor: isActiveFilter('OPEN') ? theme.primary : 'transparent' }]}
            onPress={() => handleStatPress('OPEN')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: isActiveFilter('OPEN') ? theme.primary : theme.text }]}>{stats.open || 0}</Text>
            <Text style={[styles.statLabel, { color: isActiveFilter('OPEN') ? theme.primary : theme.textMuted }]}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, isActiveFilter('IN_PROGRESS') && styles.activeStatCard, { backgroundColor: theme.bgSecondary, borderColor: isActiveFilter('IN_PROGRESS') ? theme.primary : 'transparent' }]}
            onPress={() => handleStatPress('IN_PROGRESS')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: isActiveFilter('IN_PROGRESS') ? theme.primary : theme.text }]}>{stats.inProgress || 0}</Text>
            <Text style={[styles.statLabel, { color: isActiveFilter('IN_PROGRESS') ? theme.primary : theme.textMuted }]}>In Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statCard, isActiveFilter('RESOLVED') && styles.activeStatCard, { backgroundColor: theme.bgSecondary, borderColor: isActiveFilter('RESOLVED') ? theme.primary : 'transparent' }]}
            onPress={() => handleStatPress('RESOLVED')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statValue, { color: isActiveFilter('RESOLVED') ? theme.primary : theme.text }]}>{stats.resolved || 0}</Text>
            <Text style={[styles.statLabel, { color: isActiveFilter('RESOLVED') ? theme.primary : theme.textMuted }]}>Resolved</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={handleManualRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {feedbackList.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { borderColor: theme.border, backgroundColor: theme.bgSecondary }]}>
              <MaterialCommunityIcons name="message-text-outline" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.emptyStateText, { color: theme.textMuted }]}>No feedback yet</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.textPlaceholder }]}>
              {filter 
                ? `No ${filter === 'IN_PROGRESS' ? 'in progress' : filter.toLowerCase()} feedback found` 
                : 'Your submitted feedback will appear here'}
            </Text>
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={() => navigation.navigate('Feedback')}
            >
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButtonGradient}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          feedbackList.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => handleCardPress(item.id)}
            >
              <LinearGradient
                colors={[theme.card, theme.bgSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.feedbackCard, { borderColor: theme.border }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.typeContainer}>
                    <View style={[styles.typeIcon, { borderColor: theme.border, backgroundColor: theme.bgSecondary }]}>
                      <MaterialCommunityIcons 
                        name={getFeedbackIcon(item.type) as any} 
                        size={16} 
                        color={getFeedbackColor(item.type)} 
                      />
                    </View>
                    <Text style={[styles.typeText, { color: theme.text }]}>{item.type.replace(/_/g, ' ')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status === 'IN_PROGRESS' ? 'In Progress' : item.status}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.message}
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <View style={styles.footerLeft}>
                    {item.category && (
                      <View style={[styles.categoryTag, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                        <Text style={[styles.categoryText, { color: theme.textSecondary }]}>{item.category}</Text>
                      </View>
                    )}
                    <Text style={[styles.date, { color: theme.textPlaceholder }]}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={styles.actions}>
                    {item.status !== 'RESOLVED' && item.status !== 'CLOSED' && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('FeedbackDetails', { 
                            feedbackId: item.id,
                            editMode: true 
                          });
                        }}
                        style={styles.actionButton}
                      >
                        <View style={[styles.actionButtonInner, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                          <MaterialCommunityIcons name="pencil" size={14} color={theme.primary} />
                        </View>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      style={styles.actionButton}
                    >
                      <View style={[styles.actionButtonInner, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}>
                        <MaterialCommunityIcons name="delete" size={14} color={theme.error} />
                      </View>
                    </TouchableOpacity>
                    
                    <View style={[styles.chevronButton, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                      <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textMuted} />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Helper functions (keep as is)
const getFeedbackIcon = (type: string): string => {
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

const getFeedbackColor = (type: string): string => {
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

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'OPEN': '#e67700',
    'IN_PROGRESS': '#2b8a3e',
    'RESOLVED': '#2b8a3e',
    'CLOSED': '#868e96'
  };
  return colors[status] || '#868e96';
};


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, minHeight: 60,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  title:    { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 11, marginTop: 2 }, 
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  refreshButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, gap: 8,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, position: 'relative' },
  activeStatCard: { borderWidth: 2 },
  statContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statValue: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  newBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: { padding: 16, paddingBottom: 32 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconContainer: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  emptyStateText: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptyStateSubtext: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 20, paddingHorizontal: 32, lineHeight: 18 },
  submitButton: { borderRadius: 8, overflow: 'hidden' },
  submitButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 6 },
  submitButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  feedbackCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  typeText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1 },
  categoryText: { fontSize: 10 },
  date: { fontSize: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionButton: { borderRadius: 6, overflow: 'hidden' },
  actionButtonInner: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6 },
  chevronButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6 },
});