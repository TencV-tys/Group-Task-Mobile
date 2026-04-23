// src/components/HelpGuideModal.tsx - FULLY FIXED

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HelpGuideModalProps {
  visible: boolean;
  onClose: () => void;
  userRole: 'ADMIN' | 'MEMBER';
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ visible, onClose, userRole }) => {
  const { theme } = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderSection = (title: string, icon: string, content: string, sectionKey: string) => (
    <View 
      key={sectionKey}
      style={[styles.section, { borderColor: theme.border, backgroundColor: theme.card }]}
    >
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={() => toggleSection(sectionKey)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionTitleContainer}>
          <MaterialCommunityIcons name={icon as any} size={22} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        </View>
        <MaterialCommunityIcons 
          name={expandedSection === sectionKey ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.textMuted} 
        />
      </TouchableOpacity>
      {expandedSection === sectionKey && (
        <View style={[styles.sectionContent, { borderTopColor: theme.border }]}>
          <Text style={[styles.contentText, { color: theme.textSecondary }]}>{content}</Text>
        </View>
      )}
    </View>
  );

  const memberSections = [
    { 
      key: 'dashboard', 
      title: '📋 Your Dashboard', 
      icon: 'view-dashboard',
      content: '• Pending Tasks: Tasks assigned to you that need action\n• Due Today: Tasks that must be completed today\n• Completed: Tasks you\'ve successfully verified\n• My Neglected: Tasks you missed (points deducted)\n• My Swaps: Your pending swap requests'
    },
    { 
      key: 'complete', 
      title: '✅ How to Complete a Task', 
      icon: 'check-circle',
      content: '1. Go to My Tasks tab\n2. Find the task due today\n3. Tap on the task card\n4. Take/upload a photo as proof\n5. Add notes (optional)\n6. Submit within the time window:\n   • On-time: End time + 25 min → Full points\n   • Late: End time + 25-30 min → 50% penalty\n   • Expired: After 30 min → No submission allowed'
    },
    { 
      key: 'status', 
      title: '🔄 Understanding Task Status', 
      icon: 'information',
      content: '✅ Verified: Admin approved your work - Points awarded\n⏳ Pending Review: Submitted, waiting for admin\n❌ Rejected: Admin rejected your work - Check feedback\n⏰ Due Today: Must complete today - Submit now!\n⚠️ Missed: Missed the deadline - Points deducted\n⏳ Not Started: Haven\'t started yet'
    },
    { 
      key: 'swaps', 
      title: '🔄 Swap Requests', 
      icon: 'swap-horizontal',
      content: '• Week Swap: Exchange ALL your tasks for the week (within 24 hours)\n• Day Swap: Exchange a specific day\'s tasks\n• Note: Cannot swap after submitting any task'
    },
    { 
      key: 'time', 
      title: '⏰ Time Guidelines', 
      icon: 'clock',
      content: '• Submission window: Opens at end time, closes after 30 minutes\n• On-time: First 25 minutes\n• Late: Next 5 minutes (50% penalty)\n• Grace period: 30 minutes total'
    },
    { 
      key: 'points', 
      title: '📊 Points System', 
      icon: 'star',
      content: '• Points are awarded only when admin VERIFIES your submission\n• Late submissions get 50% of original points\n• Missed tasks deduct points'
    }
  ];

  const adminSections = [
    { 
      key: 'tasks', 
      title: '🎯 Task Management', 
      icon: 'format-list-checks',
      content: '• Create Tasks: Each task must have UNIQUE points (1-10) for fair rotation\n• Edit Tasks: Only allowed if task is NOT assigned\n• Delete Tasks: History preserved, rotation slot freed'
    },
    { 
      key: 'rotation', 
      title: '🔄 Rotation System', 
      icon: 'calendar-sync',
      content: '• Tasks rotate to the NEXT member every week\n• After N weeks (N = members count), every member has held every task\n• All recurring tasks must be created on the SAME weekday'
    },
    { 
      key: 'review', 
      title: '📸 Reviewing Submissions', 
      icon: 'clipboard-check',
      content: '1. Go to Pending Review button (red badge shows count)\n2. Review each submission (photo + notes)\n3. Approve → Award points to member\n4. Reject → Add feedback, no points awarded'
    },
    { 
      key: 'stats', 
      title: '📊 Understanding Statistics', 
      icon: 'chart-bar',
      content: 'Admin Dashboard Shows:\n• Total Members: Active members in group\n• Members in Rotation: Members receiving tasks\n• Tasks Created: Recurring tasks count\n• Weekly Completion: Verified vs pending tasks\n\nTeam Overview Shows:\n• Each member\'s points and completion rate\n• Expand to see detailed breakdown\n• Sort by points, completion, or name'
    },
    { 
      key: 'important', 
      title: '⚠️ Important Notes', 
      icon: 'alert',
      content: '• Creation Day Lock: All recurring tasks must be created on the SAME weekday\n• Unique Points Rule: Each recurring task must have UNIQUE points (1-10)\n• Week Swap for Members: Members can swap within FIRST 24 hours, cannot swap after submitting any task'
    },
    { 
      key: 'best', 
      title: '📈 Best Practices', 
      icon: 'lightbulb',
      content: '1. Create tasks regularly to match member count\n2. Review submissions promptly (within 24 hours)\n3. Provide clear rejection feedback\n4. Monitor rotation status banner for warnings\n5. Keep task points consistent (1-10 range)'
    }
  ];

  const sections = userRole === 'ADMIN' ? adminSections : memberSections;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.modalContent, { backgroundColor: theme.card }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIcon}
              >
                <MaterialCommunityIcons name="help-circle" size={20} color="white" />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {userRole === 'ADMIN' ? 'Admin Guide' : 'Member Guide'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.bgTertiary }]}>
              <MaterialCommunityIcons name="close" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.welcomeCard, { borderColor: theme.primaryBorder }]}
            >
              <MaterialCommunityIcons name="lightbulb" size={24} color={theme.primary} />
              <Text style={[styles.welcomeText, { color: theme.primary }]}>
                {userRole === 'ADMIN' 
                  ? 'Welcome to the Admin Guide! Here\'s everything you need to manage your group effectively.'
                  : 'Welcome to the Member Guide! Here\'s everything you need to complete tasks successfully.'}
              </Text>
            </LinearGradient>

            {sections.map(section => renderSection(section.title, section.icon, section.content, section.key))}

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>
                Need more help? Contact your group administrator.
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
  },
  welcomeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 16,
    borderTopWidth: 1,
  },
  contentText: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});