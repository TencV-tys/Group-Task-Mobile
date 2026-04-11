// src/screens/FeedbackDetailsScreen.tsx - Custom Dropdown (Dark Mode Fixed)
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeedback } from '../feedbackHook/useFeedback';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

const FEEDBACK_TYPES = [
  { label: 'Bug Report',       value: 'BUG' },
  { label: 'Feature Request',  value: 'FEATURE_REQUEST' },
  { label: 'General Feedback', value: 'GENERAL' },
  { label: 'Suggestion',       value: 'SUGGESTION' },
  { label: 'Complaint',        value: 'COMPLAINT' },
  { label: 'Question',         value: 'QUESTION' },
  { label: 'Other',            value: 'OTHER' },
];

const CATEGORIES = [
  { label: 'None',           value: '' },
  { label: 'UI/UX',         value: 'UI' },
  { label: 'Performance',   value: 'Performance' },
  { label: 'Tasks',         value: 'Task' },
  { label: 'Groups',        value: 'Group' },
  { label: 'Authentication',value: 'Auth' },
  { label: 'Other',         value: 'Other' },
];

// ─── Custom Dropdown ──────────────────────────────────────────────────────────
// Uses an inline View overlay instead of a nested Modal to avoid the Android
// bug where a Modal-inside-a-Modal causes the back gesture to close the outer
// modal (and navigate back to the Expo app) instead of the inner dropdown.
interface DropdownOption { label: string; value: string; }

interface CustomDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void; // lets parent know a dropdown is open
}

function CustomDropdown({ label, value, options, onChange, disabled, onOpenChange }: CustomDropdownProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    onOpenChange?.(true);
  };

  const handleClose = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    handleClose();
  };

  return (
    <View style={{ marginBottom: 20, zIndex: open ? 999 : 1 }}>
      <Text style={[dd.label, { color: theme.textMuted }]}>{label}</Text>

      {/* Trigger button */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={[dd.trigger, { backgroundColor: theme.bgSecondary, borderColor: open ? theme.primary : theme.border }]}
      >
        <Text style={[dd.triggerText, { color: theme.text }]}>
          {selected?.label || 'Select...'}
        </Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={open ? theme.primary : theme.textMuted}
        />
      </TouchableOpacity>

      {/* Inline dropdown list — no nested Modal */}
      {open && (
        <View style={[dd.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {options.map((item, index) => {
            const isSelected = item.value === value;
            const isLast = index === options.length - 1;
            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  dd.option,
                  !isLast && { borderBottomWidth: 0.5, borderBottomColor: theme.border },
                  isSelected && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => handleSelect(item.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  dd.optionText,
                  { color: theme.text },
                  isSelected && { color: theme.primary, fontWeight: '600' },
                ]}>
                  {item.label}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons name="check" size={18} color={theme.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const dd = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  triggerText: {
    fontSize: 14,
    flex: 1,
  },
  // inline dropdown list, renders directly below the trigger
  sheet: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  optionText: {
    fontSize: 14,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FeedbackDetailsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { feedbackId } = route.params;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType,     setEditType]     = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMessage,  setEditMessage]  = useState('');
  const [updating,     setUpdating]     = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  // prevents back gesture from closing edit modal while a dropdown is expanded
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    loading,
    selectedFeedback,
    loadFeedbackDetails,
    updateFeedback,
    deleteFeedback,
    clearSelected,
    authError,
  } = useFeedback();

  useEffect(() => {
    loadFeedbackDetails(feedbackId);
    return () => { clearSelected(); };
  }, [feedbackId]);

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }
  }, [authError]);

  useEffect(() => {
    if (selectedFeedback) {
      setEditType(selectedFeedback.type);
      setEditCategory(selectedFeedback.category || '');
      setEditMessage(selectedFeedback.message);
    }
  }, [selectedFeedback]);

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
              if (deleted) navigation.goBack();
            });
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (selectedFeedback?.status === 'RESOLVED' || selectedFeedback?.status === 'CLOSED') {
      Alert.alert('Cannot Edit', 'This feedback is already resolved or closed and cannot be edited.');
      return;
    }
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editMessage.trim()) {
      Alert.alert('Error', 'Feedback message cannot be empty');
      return;
    }
    setUpdating(true);
    const result = await updateFeedback(feedbackId, {
      type: editType,
      message: editMessage.trim(),
      category: editCategory || null,
    });
    setUpdating(false);
    if (result.success) {
      setEditModalVisible(false);
      setLocalLoading(true);
      await loadFeedbackDetails(feedbackId);
      setLocalLoading(false);
    }
  };

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading || localLoading) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            {localLoading ? 'Updating feedback...' : 'Loading feedback...'}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!selectedFeedback) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Feedback Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.textMuted }]}>Feedback not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadFeedbackDetails(feedbackId)}>
            <LinearGradient colors={[theme.primary, theme.primaryDark]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const canEdit = selectedFeedback.status !== 'RESOLVED' && selectedFeedback.status !== 'CLOSED';

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Feedback Details</Text>
        <View style={styles.headerRight}>
          {canEdit && (
            <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
              <LinearGradient
                colors={[theme.bgSecondary, theme.bgTertiary]}
                style={[styles.iconButtonGradient, { borderColor: theme.border }]}
              >
                <MaterialCommunityIcons name="pencil" size={18} color={theme.primary} />
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <LinearGradient
              colors={[theme.errorBg, theme.errorBg]}
              style={[styles.iconButtonGradient, { borderColor: theme.errorBorder }]}
            >
              <MaterialCommunityIcons name="delete" size={18} color={theme.error} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          style={[styles.statusCard, { borderColor: theme.border }]}
        >
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedFeedback.status) }]}>
            <Text style={styles.statusText}>{selectedFeedback.status}</Text>
          </View>
          <Text style={[styles.dateText, { color: theme.textMuted }]}>
            {new Date(selectedFeedback.createdAt).toLocaleDateString()}
          </Text>
        </LinearGradient>

        {/* Type Card */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          style={[styles.detailCard, { borderColor: theme.border }]}
        >
          <View style={styles.detailHeader}>
            <View style={[styles.detailIcon, { backgroundColor: theme.bgTertiary }]}>
              <MaterialCommunityIcons
                name={getFeedbackIcon(selectedFeedback.type) as any}
                size={20}
                color={getFeedbackColor(selectedFeedback.type)}
              />
            </View>
            <Text style={[styles.detailTitle, { color: theme.text }]}>Feedback Type</Text>
          </View>
          <Text style={[styles.typeText, { color: theme.primary }]}>
            {selectedFeedback.type.replace('_', ' ')}
          </Text>
          {selectedFeedback.category && (
            <View style={[styles.categoryTag, { backgroundColor: theme.bgTertiary }]}>
              <Text style={[styles.categoryText, { color: theme.textSecondary }]}>{selectedFeedback.category}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Message Card */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          style={[styles.detailCard, { borderColor: theme.border }]}
        >
          <View style={styles.detailHeader}>
            <View style={[styles.detailIcon, { backgroundColor: theme.bgTertiary }]}>
              <MaterialCommunityIcons name="message" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.detailTitle, { color: theme.text }]}>Your Message</Text>
            {canEdit && (
              <TouchableOpacity onPress={handleEdit} style={[styles.editMessageButton, { backgroundColor: theme.bgTertiary }]}>
                <MaterialCommunityIcons name="pencil" size={16} color={theme.primary} />
                <Text style={[styles.editMessageText, { color: theme.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.messageText, { color: theme.textSecondary }]}>{selectedFeedback.message}</Text>
        </LinearGradient>

        {/* Timeline */}
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          style={[styles.timelineCard, { borderColor: theme.border }]}
        >
          <Text style={[styles.timelineTitle, { color: theme.text }]}>Timeline</Text>

          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: theme.primary }]} />
              <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
            </View>
            <View style={styles.timelineRight}>
              <Text style={[styles.timelineEvent, { color: theme.text }]}>Feedback Submitted</Text>
              <Text style={[styles.timelineDate, { color: theme.textMuted }]}>
                {new Date(selectedFeedback.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>

          {selectedFeedback.updatedAt !== selectedFeedback.createdAt && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: theme.textMuted }]} />
              </View>
              <View style={styles.timelineRight}>
                <Text style={[styles.timelineEvent, { color: theme.text }]}>Last Updated</Text>
                <Text style={[styles.timelineDate, { color: theme.textMuted }]}>
                  {new Date(selectedFeedback.updatedAt).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {selectedFeedback.status !== 'OPEN' && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(selectedFeedback.status) }]} />
              </View>
              <View style={styles.timelineRight}>
                <Text style={[styles.timelineEvent, { color: theme.text }]}>Status Updated</Text>
                <Text style={[styles.timelineDate, { color: theme.textMuted }]}>
                  Changed to {selectedFeedback.status}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {!canEdit && (
          <LinearGradient
            colors={[theme.bgSecondary, theme.bgTertiary]}
            style={[styles.infoBox, { borderColor: theme.border }]}
          >
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.infoText, { color: theme.textMuted }]}>
              This feedback is {selectedFeedback.status.toLowerCase()} and cannot be edited.
            </Text>
          </LinearGradient>
        )}
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          // on Android, back button fires onRequestClose — only close the
          // edit modal if no inline dropdown is currently expanded
          if (!dropdownOpen) setEditModalVisible(false);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Feedback</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: theme.bgTertiary }]}
              >
                <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* ✅ Custom dropdowns — fully themed, inline, no nested Modal */}
              <CustomDropdown
                label="Feedback Type *"
                value={editType}
                options={FEEDBACK_TYPES}
                onChange={setEditType}
                disabled={updating}
                onOpenChange={setDropdownOpen}
              />

              <CustomDropdown
                label="Category (Optional)"
                value={editCategory}
                options={CATEGORIES}
                onChange={setEditCategory}
                disabled={updating}
                onOpenChange={setDropdownOpen}
              />

              {/* Message Input */}
              <View>
                <Text style={[styles.modalLabel, { color: theme.textMuted }]}>Your Feedback *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.bgSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  multiline
                  numberOfLines={8}
                  value={editMessage}
                  onChangeText={setEditMessage}
                  textAlignVertical="top"
                  editable={!updating}
                  placeholder="Enter your feedback..."
                  placeholderTextColor={theme.textPlaceholder}
                  selectionColor={theme.primary}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={updating}
              >
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  style={styles.modalCancelGradient}
                >
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveButton, updating && styles.buttonDisabled]}
                onPress={handleUpdate}
                disabled={updating}
              >
                <LinearGradient
                  colors={updating ? [theme.bgSecondary, theme.bgTertiary] : [theme.primary, theme.primaryDark]}
                  style={styles.modalSaveGradient}
                >
                  {updating
                    ? <ActivityIndicator size="small" color={theme.textMuted} />
                    : <Text style={styles.modalSaveText}>Save Changes</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const getFeedbackIcon = (type: string) => {
  const icons: Record<string, string> = {
    BUG: 'bug', FEATURE_REQUEST: 'lightbulb', GENERAL: 'message',
    SUGGESTION: 'lightbulb-outline', COMPLAINT: 'alert-circle',
    QUESTION: 'help-circle', OTHER: 'dots-horizontal',
  };
  return icons[type] || 'message';
};

const getFeedbackColor = (type: string) => {
  const colors: Record<string, string> = {
    BUG: '#fa5252', FEATURE_REQUEST: '#e67700', GENERAL: '#2b8a3e',
    SUGGESTION: '#4F46E5', COMPLAINT: '#fa5252', QUESTION: '#2b8a3e', OTHER: '#868e96',
  };
  return colors[type] || '#2b8a3e';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    OPEN: '#e67700', IN_PROGRESS: '#2b8a3e', RESOLVED: '#2b8a3e', CLOSED: '#868e96',
  };
  return colors[status] || '#868e96';
};

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, minHeight: 60,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { borderRadius: 8, overflow: 'hidden' },
  iconButtonGradient: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  content: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, marginTop: 16, marginBottom: 16 },
  retryButton: { borderRadius: 8, overflow: 'hidden' },
  retryButtonGradient: { paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statusCard: {
    borderRadius: 12, padding: 16, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 13 },
  detailCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  detailIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  editMessageButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  editMessageText: { fontSize: 12, fontWeight: '500' },
  typeText: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  categoryTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  categoryText: { fontSize: 11 },
  messageText: { fontSize: 14, lineHeight: 22 },
  timelineCard: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  timelineTitle: { fontSize: 15, fontWeight: '600', marginBottom: 16 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineLeft: { width: 30, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineRight: { flex: 1, paddingLeft: 12 },
  timelineEvent: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  timelineDate: { fontSize: 12, marginBottom: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '600' },
  closeButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginLeft: 4 },
  modalInput: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, minHeight: 150,
    textAlignVertical: 'top', lineHeight: 20,
  },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderTopWidth: 1, gap: 12 },
  modalCancelButton: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  modalCancelGradient: { paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSaveButton: { flex: 1, borderRadius: 8, overflow: 'hidden' },
  modalSaveGradient: { paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  modalSaveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});