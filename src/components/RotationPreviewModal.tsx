// src/components/RotationPreviewModal.tsx - COMPLETE FIXED VERSION

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TaskService } from '../services/TaskService';

interface RotationPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export const RotationPreviewModal: React.FC<RotationPreviewModalProps> = ({
  visible,
  onClose,
  groupId,
  groupName
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      console.log('\n🔍🔍🔍 ========================================');
      console.log('🔍🔍🔍 [RotationPreviewModal] OPENED');
      console.log('🔍🔍🔍 ========================================');
      console.log(`📦 Group ID: ${groupId}`);
      console.log(`📦 Group Name: ${groupName}`);
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      fetchPreview();
    }
  }, [visible]);

  const fetchPreview = async () => {
    console.log('\n📡 [fetchPreview] Starting...');
    setLoading(true);
    try {
      const result = await TaskService.previewRotation(groupId);
      
      console.log(`📡 [fetchPreview] Response status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (result.success) {
        setPreviewData(result.data);
        
        console.log('\n📊 ========== ROTATION PREVIEW DATA ==========');
        console.log(`📅 Current Week: ${result.data.currentWeek}`);
        console.log(`📅 Next Week: ${result.data.nextWeek}`);
        console.log(`🔄 Rotation Offset: ${result.data.rotationOffset}`);
        console.log(`👥 Members in Rotation: ${result.data.membersInRotation}`);
        console.log(`📋 Total Tasks: ${result.data.tasksCount}`);
        
        console.log('\n📊 TASK PRIORITY ORDER (Highest to Lowest Points):');
        if (result.data.tasksSortedByPoints) {
          result.data.tasksSortedByPoints.forEach((task: any, idx: number) => {
            console.log(`   ${idx + 1}. "${task.title}" - ${task.points} pts`);
          });
        }
        
        console.log('\n📋 CURRENT ASSIGNMENTS (Week ' + result.data.currentWeek + '):');
        if (result.data.currentAssignments) {
          result.data.currentAssignments.forEach((assignment: any) => {
            const isManual = assignment.isManuallyAssigned ? '⚠️ MANUAL' : '✅ AUTO';
            console.log(`   ${assignment.memberName} (Order:${assignment.rotationOrder}) → "${assignment.taskTitle}" (${assignment.taskPoints} pts) [${isManual}]`);
          });
        }
        
        console.log('\n🔄 AFTER ROTATION (Week ' + result.data.nextWeek + '):');
        if (result.data.previewAssignments) {
          result.data.previewAssignments.forEach((assignment: any) => {
            console.log(`   ${assignment.memberName} (Order:${assignment.rotationOrder}) → "${assignment.taskTitle}" (${assignment.taskPoints} pts)`);
          });
        }
        
        console.log('\n⚠️ CONFLICTS (Manual Overrides Detected):');
        if (result.data.conflicts && result.data.conflicts.length > 0) {
          result.data.conflicts.forEach((conflict: any, idx: number) => {
            console.log(`   ${idx + 1}. ${conflict.memberName}:`);
            console.log(`      Current: ${conflict.currentTaskTitle}`);
            console.log(`      Auto: ${conflict.previewTaskTitle}`);
          });
        } else {
          console.log('   ✅ No conflicts detected');
        }
        
        console.log('\n🧮 ROTATION FORMULA:');
        console.log(`   nextWeek (${result.data.nextWeek}) % members (${result.data.membersInRotation}) = offset (${result.data.rotationOffset})`);
        console.log(`   Member at position i gets task from position (i + offset) % tasks.length`);
        
        console.log('\n✅ ========== PREVIEW LOAD COMPLETE ==========\n');
        
      } else {
        console.log(`❌ [fetchPreview] Error: ${result.message}`);
        Alert.alert('Error', result.message || 'Failed to load preview');
      }
    } catch (error: any) {
      console.error('❌ [fetchPreview] Exception:', error);
      Alert.alert('Error', error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getPointsColor = (points: number, index: number) => {
    if (index === 0) return '#FFD700';
    if (index === 1) return '#C0C0C0';
    if (index === 2) return '#CD7F32';
    return theme.primary;
  };

  const renderTasksOrder = () => {
    if (!previewData?.tasksSortedByPoints) return null;
    
    return (
      <View style={[styles.tasksOrderSection, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <Text style={[styles.tasksOrderTitle, { color: theme.text }]}>📊 Task Priority Order</Text>
        <Text style={[styles.tasksOrderSubtitle, { color: theme.textMuted }]}>
          Tasks are sorted by points (highest to lowest)
        </Text>
        {previewData.tasksSortedByPoints.map((task: any, idx: number) => (
          <View key={task.id} style={[styles.taskOrderRow, { borderBottomColor: theme.border }]}>
            <LinearGradient
              colors={[getPointsColor(task.points, idx), getPointsColor(task.points, idx) + '80']}
              style={styles.taskOrderRank}
            >
              <Text style={styles.taskOrderRankText}>{idx + 1}</Text>
            </LinearGradient>
            <Text style={[styles.taskOrderName, { color: theme.text }]} numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={[styles.taskOrderPoints, { color: getPointsColor(task.points, idx) }]}>
              {task.points} pts
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // ✅ FIXED: Sort by task points (HIGHEST to LOWEST) - NO rotation order!
const renderAssignmentSection = (title: string, assignments: any[], isCurrent: boolean) => {
  if (!assignments || assignments.length === 0) return null;
  
  // Filter out "No task assigned" entries
  const validAssignments = assignments.filter(a => a.taskId !== null && a.taskPoints > 0);
  
  if (validAssignments.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        <View style={styles.emptyAssignments}>
          <Text style={[styles.emptyAssignmentsText, { color: theme.textMuted }]}>
            No assignments for this week
          </Text>
        </View>
      </View>
    );
  }
  
  // ✅ Sort by task points (HIGHEST to LOWEST) - THIS IS WHAT YOU WANT
  const sorted = [...validAssignments].sort((a, b) => b.taskPoints - a.taskPoints);
  
  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {sorted.map((item, idx) => {
        const pointsColor = getPointsColor(item.taskPoints, idx);
        const isHighest = idx === 0;
        const isLowest = idx === sorted.length - 1;
        
        return (
          <View 
            key={item.memberId} 
            style={[
              styles.assignmentRow, 
              { borderBottomColor: theme.border },
              isHighest && styles.highestRow,
              isLowest && styles.lowestRow
            ]}
          >
            <View style={styles.memberInfo}>
              {/* ✅ Show rank by POINTS (1, 2, 3...) NOT rotation order */}
              <LinearGradient
                colors={isHighest ? ['#FFD700', '#FFA500'] : [theme.primary, theme.primaryDark]}
                style={[styles.rankBadge, isHighest && styles.highestBadge]}
              >
                <Text style={styles.rankText}>{idx + 1}</Text>
              </LinearGradient>
              <Text style={[styles.memberName, { color: theme.text }]}>
                {item.memberName}
              </Text>
              {isHighest && (
                <View style={styles.topRankTag}>
                  <Text style={styles.topRankTagText}>🏆 Highest Points</Text>
                </View>
              )}
              {isLowest && (
                <View style={styles.bottomRankTag}>
                  <Text style={styles.bottomRankTagText}>⬇️ Lowest Points</Text>
                </View>
              )}
            </View>
            
            <View style={styles.taskInfo}>
              <LinearGradient
                colors={[`${pointsColor}20`, `${pointsColor}10`]}
                style={[styles.pointsBadge, { borderColor: pointsColor }]}
              >
                <MaterialCommunityIcons name="star" size={12} color={pointsColor} />
                <Text style={[styles.pointsText, { color: pointsColor }]}>
                  {item.taskPoints} pts
                </Text>
              </LinearGradient>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                {item.taskTitle}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

  const renderArrow = () => (
    <View style={styles.arrowContainer}>
      <LinearGradient
        colors={[theme.primary, theme.primaryDark]}
        style={styles.arrowCircle}
      >
        <MaterialCommunityIcons name="arrow-down" size={24} color="#fff" />
      </LinearGradient>
      <Text style={[styles.rotationOffset, { color: theme.textSecondary }]}>
        Rotation Offset: {previewData?.rotationOffset}
      </Text>
      <Text style={[styles.rotationFormula, { color: theme.textMuted }]}>
        Formula: nextWeek ({previewData?.nextWeek}) % members ({previewData?.membersInRotation}) = {previewData?.rotationOffset}
      </Text>
    </View>
  );

  // ✅ UPDATED: Manual Override Explanation
  const renderManualOverrideExplanation = () => {
    if (!previewData?.conflicts || previewData.conflicts.length === 0) return null;
    
    return (
      <View style={[styles.explanationCard, { 
        backgroundColor: theme.primaryLight + '20', 
        borderColor: theme.primaryBorder,
        marginBottom: 16,
        borderRadius: 12,
        borderWidth: 1,
        padding: 14
      }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <MaterialCommunityIcons name="account-check" size={22} color={theme.primary} />
          <Text style={[styles.explanationTitle, { color: theme.primary, fontWeight: '700', fontSize: 11 }]}>
            💡 Don't Mind the Manual Overrides
          </Text>
        </View>
        
        <Text style={[styles.explanationText, { color: theme.text, fontSize: 13, lineHeight: 20, marginBottom: 8 }]}>
          • <Text style={{ fontWeight: '700' }}>"Conflicts" are NOT errors!</Text> They just show that your manual preference differs from auto-rotation.
        </Text>
        
        <Text style={[styles.explanationText, { color: theme.text, fontSize: 13, lineHeight: 20, marginBottom: 8 }]}>
          • <Text style={{ fontWeight: '700' }}>Manual assignments</Text> are for setting up your PREFERRED starting week - THAT'S THE WHOLE POINT!
        </Text>
        
        <Text style={[styles.explanationText, { color: theme.text, fontSize: 13, lineHeight: 20, marginBottom: 8 }]}>
          • After Week 1, <Text style={{ fontWeight: '700' }}>automatic rotation takes over</Text> and handles fairness automatically.
        </Text>
        
        <Text style={[styles.explanationText, { color: theme.text, fontSize: 13, lineHeight: 20, marginBottom: 8 }]}>
          • <Text style={{ fontWeight: '700' }}>You can still manually reassign anytime</Text> - your preference ALWAYS wins for the current week.
        </Text>
        
        <Text style={[styles.explanationText, { color: theme.primary, fontSize: 13, lineHeight: 20, fontStyle: 'italic', marginTop: 4 }]}>
          ✅ Bottom Line: Manual overrides = YOUR choice. Auto-rotation = FAIRNESS over time. Both work together perfectly!
        </Text>
      </View>
    );
  };
  
  const renderConflicts = () => {
    if (!previewData?.conflicts || previewData.conflicts.length === 0) return null;
    
    // Filter conflicts to only show meaningful ones (skip "No task assigned" conflicts if desired)
    const meaningfulConflicts = previewData.conflicts.filter((conflict: any) => 
      conflict.currentTaskTitle !== "No task assigned"
    );
    
    if (meaningfulConflicts.length === 0) return null;
    
    return (
      <View style={[styles.conflictsSection, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}>
        <View style={styles.conflictsHeader}>
          <MaterialCommunityIcons name="alert-circle" size={20} color={theme.error} />
          <Text style={[styles.conflictsTitle, { color: theme.error }]}>⚠️ Manual Overrides Detected</Text>
        </View>
        {meaningfulConflicts.map((conflict: any, idx: number) => (
          <View key={idx} style={styles.conflictItem}>
            <Text style={[styles.conflictMember, { color: theme.text }]}>{conflict.memberName}</Text>
            <Text style={[styles.conflictDetail, { color: theme.textMuted }]}>
              Current: {conflict.currentTaskTitle} → Auto: {conflict.previewTaskTitle}
            </Text>
          </View>
        ))}
        <Text style={[styles.conflictNote, { color: theme.textMuted }]}>
          ⚠️ These manual assignments differ from automatic rotation
        </Text>
      </View>
    );
  };

  // ✅ FIXED: Only show members with ACTUAL assignments
  const renderRotationVisual = () => {
    if (!previewData?.currentAssignments || !previewData?.previewAssignments) return null;
    
    const members = previewData.currentAssignments;
    const preview = previewData.previewAssignments;
    
    // ✅ FILTER OUT members with "No task assigned" or 0 points
    const validEntries = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (member.taskId !== null && member.taskPoints > 0) {
        validEntries.push({
          current: member,
          preview: preview[i]
        });
      }
    }
    
    if (validEntries.length === 0) return null;
    
    return (
      <View style={[styles.rotationVisual, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <Text style={[styles.visualTitle, { color: theme.text }]}>🔄 How Rotation Works</Text>
        <View style={styles.visualGrid}>
          {validEntries.slice(0, 3).map((entry, idx) => {
            const currentTask = entry.current.taskTitle?.substring(0, 15) || '';
            const previewTask = entry.preview?.taskTitle?.substring(0, 15) || '';
            const isMoving = currentTask !== previewTask && previewTask !== '';
            
            return (
              <View key={entry.current.memberId} style={styles.visualRow}>
                <Text style={[styles.visualMember, { color: theme.primary }]}>
                  {entry.current.memberName?.split(' ')[0] || entry.current.memberName}
                </Text>
                <View style={styles.visualArrow}>
                  <Text style={[styles.visualTask, { color: theme.textSecondary }]}>
                    {currentTask}
                  </Text>
                  {isMoving ? (
                    <MaterialCommunityIcons name="arrow-right" size={16} color={theme.primary} />
                  ) : (
                    <MaterialCommunityIcons name="minus" size={16} color={theme.textMuted} />
                  )}
                  <Text style={[styles.visualTask, { color: theme.text }]}>
                    {previewTask || 'No task'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        console.log('🔚 [RotationPreviewModal] Closed by user');
        onClose();
      }}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <LinearGradient
          colors={[theme.card, theme.bgSecondary]}
          style={[styles.modalContent, { backgroundColor: theme.card }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                style={styles.headerIcon}
              >
                <MaterialCommunityIcons name="sync" size={20} color="#fff" />
              </LinearGradient>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Rotation Preview</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                console.log('🔚 [RotationPreviewModal] Closed via X button');
                onClose();
              }} 
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading preview...</Text>
              </View>
            ) : previewData ? (
              <>
                <View style={styles.infoHeader}>
                  <Text style={[styles.groupName, { color: theme.text }]}>{groupName}</Text>
                  <View style={styles.weekInfo}>
                    <LinearGradient
                      colors={[theme.primaryLight, theme.primaryLight]}
                      style={styles.weekBadge}
                    >
                      <Text style={[styles.weekText, { color: theme.primary }]}>
                        Week {previewData.currentWeek}
                      </Text>
                    </LinearGradient>
                    <MaterialCommunityIcons name="arrow-right" size={20} color={theme.primary} />
                    <LinearGradient
                      colors={[theme.primary, theme.primaryDark]}
                      style={styles.nextWeekBadge}
                    >
                      <Text style={styles.nextWeekText}>Week {previewData.nextWeek}</Text>
                    </LinearGradient>
                  </View>
                </View>

                {renderTasksOrder()}
                
                {renderAssignmentSection('📋 CURRENT ASSIGNMENTS', previewData.currentAssignments, true)}
                
                {renderArrow()}
                
                {renderAssignmentSection('🔄 AFTER ROTATION (AUTOMATIC)', previewData.previewAssignments, false)}
                
                {renderRotationVisual()}
                
                {renderManualOverrideExplanation()}
                
                {renderConflicts()}
                
                <View style={styles.infoNote}>
                  <MaterialCommunityIcons name="information" size={16} color={theme.primary} />
                  <Text style={[styles.infoNoteText, { color: theme.textMuted }]}>
                    This is a PREVIEW only. No changes have been made to the system.
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.closeOnlyButton}
                    onPress={() => {
                      console.log('🔚 [RotationPreviewModal] Closed via Close button');
                      onClose();
                    }}
                  >
                    <LinearGradient
                      colors={[theme.primary, theme.primaryDark]}
                      style={styles.closeButtonGradient}
                    >
                      <MaterialCommunityIcons name="check" size={18} color="#fff" />
                      <Text style={styles.closeButtonText}>Close</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={48} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>Failed to load preview</Text>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={() => {
                    console.log('🔄 [RotationPreviewModal] Retry button pressed');
                    fetchPreview();
                  }}
                >
                  <LinearGradient
                    colors={[theme.primaryLight, theme.primaryLight]}
                    style={styles.retryButtonGradient}
                  >
                    <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    maxHeight: '88%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  infoHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  weekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weekBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  weekText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nextWeekBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  nextWeekText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  assignmentRow: {
    padding: 12,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highestBadge: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  topRankTag: {
    backgroundColor: '#FFD70020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  topRankTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
  },
  bottomRankTag: {
    backgroundColor: '#868e9620',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  bottomRankTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#868e96',
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 13,
    flex: 1,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  arrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  rotationOffset: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  rotationFormula: {
    fontSize: 10,
    marginTop: 2,
  },
  conflictsSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  conflictsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conflictsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  conflictItem: {
    marginBottom: 6,
    paddingLeft: 28,
  },
  conflictMember: {
    fontSize: 13,
    fontWeight: '500',
  },
  conflictDetail: {
    fontSize: 12,
  },
  conflictNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  tasksOrderSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  tasksOrderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tasksOrderSubtitle: {
    fontSize: 11,
    marginBottom: 12,
  },
  taskOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  taskOrderRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskOrderRankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskOrderName: {
    flex: 1,
    fontSize: 13,
  },
  taskOrderPoints: {
    fontSize: 13,
    fontWeight: '600',
  },
  rotationVisual: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  visualTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  visualGrid: {
    gap: 8,
  },
  visualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visualMember: {
    width: 50,
    fontSize: 12,
    fontWeight: '600',
  },
  visualArrow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  visualTask: {
    flex: 1,
    fontSize: 11,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    padding: 10,
  },
  infoNoteText: {
    fontSize: 12,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  closeOnlyButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  }, 
  retryButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  explanationCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  emptyAssignments: {
    padding: 20,
    alignItems: 'center',
  },
  emptyAssignmentsText: {
    fontSize: 13,
    textAlign: 'center',
  },
highestRow: {
  backgroundColor: 'rgba(255, 215, 0, 0.08)', // Gold tint for highest points
  borderLeftWidth: 3,
  borderLeftColor: '#FFD700',
},
lowestRow: {
  backgroundColor: 'rgba(134, 142, 150, 0.08)', // Gray tint for lowest points
  borderLeftWidth: 3,
  borderLeftColor: '#868e96',
},
});