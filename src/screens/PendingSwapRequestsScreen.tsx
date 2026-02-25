// src/screens/PendingSwapRequestsScreen.tsx - UPDATED with clean UI and consistent colors
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSwapRequests } from '../SwapRequestHooks/useSwapRequests';
import { SwapRequestService } from '../services/SwapRequestService';

export const PendingSwapRequestsScreen = () => {
  const navigation = useNavigation();
  const {
    pendingForMe,
    loading,
    error,
    totalPendingForMe,
    loadPendingForMe,
    acceptSwapRequest,
    rejectSwapRequest,
  } = useSwapRequests();

  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPendingForMe();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPendingForMe();
    setRefreshing(false);
  };

  const handleAccept = (requestId: string, scope?: string, selectedDay?: string) => {
    const swapDescription = scope === 'day' 
      ? `this swap for ${selectedDay || 'specific day'}`
      : 'this entire week swap';
    
    Alert.alert(
      'Accept Swap Request',
      `Are you sure you want to accept ${swapDescription}? This assignment will be transferred to you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await acceptSwapRequest(requestId);
            setProcessingId(null);
          },
        },
      ]
    );
  };

  const handleReject = (requestId: string) => {
    Alert.alert(
      'Reject Swap Request',
      'Are you sure you want to reject this swap request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await rejectSwapRequest(requestId);
            setProcessingId(null);
          },
        },
      ]
    );
  };

  const handleViewDetails = (requestId: string) => {
    // @ts-ignore
    navigation.navigate('SwapRequestDetails', { requestId });
  };

  const renderSwapRequest = ({ item }: { item: any }) => {
    const statusColor = SwapRequestService.getStatusColor(item.status);
    const statusLabel = SwapRequestService.getStatusLabel(item.status);
    const statusIcon = SwapRequestService.getStatusIcon(item.status);
    const isProcessing = processingId === item.id;
    
    const dueDate = item.assignment?.dueDate;
    const taskTitle = item.assignment?.task?.title || 'Task';
    const requesterName = item.requester?.fullName || 'A user';
    const requesterAvatar = item.requester?.avatarUrl;
    const timeSlot = item.assignment?.timeSlot?.startTime;
    const points = item.assignment?.points || 0;
    const scope = item.scope || 'week';
    const selectedDay = item.selectedDay;
    const selectedTimeSlot = item.selectedTimeSlot;

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => handleViewDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.requesterInfo}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              {requesterAvatar ? (
                <Image source={{ uri: requesterAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {requesterName.charAt(0).toUpperCase()}
                </Text>
              )}
            </LinearGradient>
            <View>
              <Text style={styles.requesterName}>{requesterName}</Text>
              <Text style={styles.requestTime}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <LinearGradient
            colors={[statusColor + '20', statusColor + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusBadge}
          >
            <MaterialCommunityIcons name={statusIcon as any} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.taskContainer}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {taskTitle}
          </Text>
          
          {/* Scope Badge */}
          <LinearGradient
            colors={scope === 'day' ? ['#EEF2FF', '#dbe4ff'] : ['#f8f9fa', '#e9ecef']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.scopeBadge,
              scope === 'day' && styles.dayScopeBadge
            ]}
          >
            <MaterialCommunityIcons 
              name={scope === 'day' ? 'calendar-today' : 'calendar-week'} 
              size={12} 
              color={scope === 'day' ? '#4F46E5' : '#495057'} 
            />
            <Text style={[
              styles.scopeBadgeText,
              scope === 'day' && styles.dayScopeBadgeText
            ]}>
              {scope === 'day' 
                ? `Swap for ${selectedDay || 'specific day'}`
                : 'Swap for entire week'}
            </Text>
          </LinearGradient>
          
          {/* Time Slot Info for Day Swaps */}
          {scope === 'day' && selectedTimeSlot && (
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.timeSlotBadge}
            >
              <MaterialCommunityIcons name="clock-outline" size={10} color="#868e96" />
              <Text style={styles.timeSlotText}>
                {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                {selectedTimeSlot.label ? ` (${selectedTimeSlot.label})` : ''}
              </Text>
            </LinearGradient>
          )}
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color="#868e96" />
              <Text style={styles.detailText}>
                {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            
            {timeSlot && scope !== 'day' && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#868e96" />
                <Text style={styles.detailText}>{timeSlot}</Text>
              </View>
            )}
            
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="star" size={14} color="#e67700" />
              <Text style={styles.detailText}>{points} pts</Text>
            </View>
          </View>

          {item.reason && (
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reasonContainer}
            >
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText} numberOfLines={2}>
                {item.reason}
              </Text>
            </LinearGradient>
          )}

        {item.expiresAt && (
  <View style={styles.expiryContainer}>
    <MaterialCommunityIcons name="clock-outline" size={12} color="#e67700" />
    <Text style={styles.expiryText}>
      Expires: {new Date(item.expiresAt).toLocaleDateString()}
    </Text>
  </View>
)}
        </View>

        {item.status === 'PENDING' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAccept(item.id, item.scope, item.selectedDay)}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={['#d3f9d8', '#b2f2bb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#2b8a3e" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={16} color="#2b8a3e" />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item.id)}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={['#fff5f5', '#ffe3e3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fa5252" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close" size={16} color="#fa5252" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing && pendingForMe.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading swap requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#495057" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Swap Requests</Text>
          {totalPendingForMe > 0 && (
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Text style={styles.badgeText}>{totalPendingForMe}</Text>
            </LinearGradient>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('MySwapRequests' as never)}
        >
          <MaterialCommunityIcons name="history" size={22} color="#495057" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={pendingForMe}
        renderItem={renderSwapRequest}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={40} color="#adb5bd" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Pending Requests</Text>
            <Text style={styles.emptyText}>
              You don't have any swap requests waiting for your response.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868e96',
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
  headerTitleContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: -20,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyButton: {
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  requestTime: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dayScopeBadge: {
    borderColor: '#dbe4ff',
  },
  scopeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#495057',
  },
  dayScopeBadgeText: {
    color: '#4F46E5',
  },
  timeSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeSlotText: {
    fontSize: 11,
    color: '#495057',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
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
    color: '#495057',
  },
  reasonContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#868e96',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#212529',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  expiryText: {
    fontSize: 11,
    color: '#e67700',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  acceptButton: {
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b8a3e',
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fa5252',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});