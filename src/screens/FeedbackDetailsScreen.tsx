import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeedback } from '../feedbackHook/useFeedback';

export default function FeedbackDetailsScreen({ navigation, route }: any) {
  const { feedbackId } = route.params;
  const {
    loading,
    selectedFeedback,
    loadFeedbackDetails,
    deleteFeedback,
    clearSelected
  } = useFeedback();

  useEffect(() => {
    // Only load if we don't have this feedback or it's a different one
    if (!selectedFeedback || selectedFeedback.id !== feedbackId) {
      loadFeedbackDetails(feedbackId);
    }

    return () => {
      clearSelected();
    };
  }, [feedbackId]); // Only depend on feedbackId, not the functions

  const handleDelete = () => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFeedback(feedbackId).then((deleted: boolean) => {
              if (deleted) {
                navigation.goBack();
              }
            });
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedFeedback) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Feedback not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons name="delete" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedFeedback.status) }]}>
            <Text style={styles.statusText}>{selectedFeedback.status}</Text>
          </View>
          <Text style={styles.dateText}>
            Submitted on {new Date(selectedFeedback.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Type Card */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <MaterialCommunityIcons 
              name={getFeedbackIcon(selectedFeedback.type) as any} 
              size={24} 
              color={getFeedbackColor(selectedFeedback.type)} 
            />
            <Text style={styles.detailTitle}>Feedback Type</Text>
          </View>
          <Text style={styles.typeText}>{selectedFeedback.type.replace('_', ' ')}</Text>
          {selectedFeedback.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{selectedFeedback.category}</Text>
            </View>
          )}
        </View>

        {/* Message Card */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <MaterialCommunityIcons name="message" size={24} color="#007AFF" />
            <Text style={styles.detailTitle}>Your Message</Text>
          </View>
          <Text style={styles.messageText}>{selectedFeedback.message}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Timeline</Text>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: '#34C759' }]} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.timelineEvent}>Feedback Submitted</Text>
              <Text style={styles.timelineDate}>
                {new Date(selectedFeedback.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>

          {selectedFeedback.status !== 'OPEN' && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: '#007AFF' }]} />
              </View>
              <View style={styles.timelineRight}>
                <Text style={styles.timelineEvent}>Status Updated</Text>
                <Text style={styles.timelineDate}>
                  Status changed to {selectedFeedback.status}
                </Text>
                {selectedFeedback.updatedAt !== selectedFeedback.createdAt && (
                  <Text style={styles.timelineSubDate}>
                    {new Date(selectedFeedback.updatedAt).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
 
// Reuse helper functions from FeedbackScreen
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6c757d',
    marginTop: 16,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  typeText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: '#e9ecef',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    color: '#495057',
  },
  messageText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 24,
  },
  timelineCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
    marginTop: 4,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 12,
  },
  timelineEvent: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 2,
  }, 
  timelineSubDate: {
    fontSize: 12,
    color: '#adb5bd',
  },
});