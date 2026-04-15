// src/screens/RotationScheduleScreen.tsx - COMPLETE UPDATED VERSION

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRotationSchedule } from '../taskHook/useRotationSchedule';
import { TokenUtils } from '../utils/tokenUtils';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { makeRotationScheduleStyles } from '../styles/rotationSchedule.styles';

export default function RotationScheduleScreen({ route, navigation }: any) {
  const { theme, isDark } = useTheme();
  const styles = makeRotationScheduleStyles(theme);
  
  const { groupId, groupName, userRole } = route.params;
  const [authError, setAuthError] = useState(false);
   
  const {
    loading, 
    refreshing,
    weeks,
    selectedWeek,
    currentWeek,
    error,
    selectedWeekData,
    setSelectedWeek,
    loadRotationSchedule,
    refresh,
    getSelectedWeekTasks,
    getTaskDistributionByDay,
    calculateFairnessScore,
    isEmpty,
  } = useRotationSchedule({
    groupId,
    initialWeeks: 4
  });

  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(true);
  const [rotationCycle, setRotationCycle] = useState<number>(0);

  // ===== CHECK AUTH USING TOKENUTILS =====
  useEffect(() => {
    const checkAuth = async () => {
      const hasToken = await TokenUtils.checkToken({
        showAlert: false,
        onAuthError: () => setAuthError(true)
      });
      if (!hasToken) {
        setAuthError(true);
      }
    };
    checkAuth();
  }, []);

  // ===== AUTH ERROR HANDLER =====
  useEffect(() => {
    if (authError) {
      Alert.alert(
        'Session Expired',
        'Please log in again',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAuthError(false);
              navigation.navigate('Login');
            }
          }
        ]
      );
    }
  }, [authError, navigation]);

  // Ensure selectedWeek is set when weeks are loaded
  useEffect(() => {
    if (weeks.length > 0 && !selectedWeek) {
      setSelectedWeek(currentWeek);
    }
  }, [weeks, selectedWeek, currentWeek, setSelectedWeek]);

  // Extract members and tasks from current week data
  useEffect(() => {
    if (selectedWeekData && selectedWeekData.tasks) {
      const memberMap = new Map();
      const taskList: any[] = [];
      
      selectedWeekData.tasks.forEach((task: any) => {
        if (task.assigneeId && task.assigneeName) {
          memberMap.set(task.assigneeId, {
            id: task.assigneeId,
            name: task.assigneeName,
            avatarUrl: task.assigneeAvatar
          });
        }
        
        taskList.push({
          id: task.taskId,
          title: task.taskTitle,
          points: task.points || 0,
          currentAssigneeId: task.assigneeId,
          currentAssigneeName: task.assigneeName
        });
      });
      
      setMembers(Array.from(memberMap.values()));
      
      const sortedTasks = [...taskList].sort((a, b) => b.points - a.points);
      setTasks(sortedTasks);
      
      generatePredictions(Array.from(memberMap.values()), sortedTasks);
    }
  }, [selectedWeekData]);

  // Generate predictions with WEEKLY rotation
  const generatePredictions = (memberList: any[], taskList: any[]) => {
    if (memberList.length === 0 || taskList.length === 0) return;
    
    const taskCount = taskList.length;
    const sortedTasks = [...taskList].sort((a, b) => b.points - a.points);
    const sortedMembers = [...memberList].sort((a, b) => a.name.localeCompare(b.name));
    
    const preds = [];
    
    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekNumber = currentWeek + weekOffset + 1;
      const assignments = [];
      
      for (let i = 0; i < sortedMembers.length; i++) {
        const taskIndex = (i + weekOffset) % taskCount;
        
        assignments.push({
          memberId: sortedMembers[i].id,
          memberName: sortedMembers[i].name,
          taskId: sortedTasks[taskIndex].id,
          taskTitle: sortedTasks[taskIndex].title,
          taskPoints: sortedTasks[taskIndex].points,
          taskRank: taskIndex + 1,
          weekNumber
        });
      }
      
      const pointsByMember: Record<string, number> = {};
      assignments.forEach(a => {
        pointsByMember[a.memberId] = (pointsByMember[a.memberId] || 0) + a.taskPoints;
      });
      
      const points = Object.values(pointsByMember);
      const maxPoints = Math.max(...points);
      const minPoints = Math.min(...points);
      const fairnessScore = maxPoints > 0 ? Math.round(100 - ((maxPoints - minPoints) / maxPoints) * 100) : 100;
      
      preds.push({
        weekNumber,
        assignments,
        fairnessScore,
        maxPoints,
        minPoints
      });
    }
    
    setPredictions(preds);
    setRotationCycle(taskCount);
  };

  const getTaskRankColor = (rank: number, total: number) => {
    if (rank === 1) return theme.error;
    if (rank === total) return theme.primary;
    if (rank <= Math.ceil(total / 3)) return theme.primary;
    return theme.textSecondary;
  };

  const getTaskRankIcon = (rank: number, total: number) => {
    if (rank === 1) return 'trophy';
    if (rank === total) return 'thumb-up';
    if (rank <= Math.ceil(total / 3)) return 'trending-up';
    return 'swap-horizontal';
  };

  // Get verified distribution by day from selectedWeekData
const getVerifiedDistributionByDay = () => {
  const verifiedData = selectedWeekData?.verifiedByDay || {
    Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0,
    Friday: 0, Saturday: 0, Sunday: 0
  };
  return verifiedData;
};

  const renderPredictionWeek = (prediction: any, index: number) => {
    if (!prediction) return null;
    
    const isFirst = index === 0;
    const totalTasks = prediction.assignments.length;
    
    const sortedAssignments = [...prediction.assignments].sort((a, b) => b.taskPoints - a.taskPoints);
    
    return (
      <LinearGradient
        key={prediction.weekNumber}
        colors={isFirst ? [theme.primaryLight, theme.primaryLight] : [theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.predictionCard, isFirst && styles.nextWeekCard, { borderColor: theme.border }]}
      >
        <View style={styles.predictionHeader}>
          <View style={styles.weekTitleContainer}>
            <Text style={[styles.predictionWeek, { color: theme.text }]}>
              {isFirst ? '🔮 NEXT WEEK' : `Week ${prediction.weekNumber}`}
            </Text>
            {isFirst && (
              <LinearGradient
                colors={[theme.primary, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.currentBadge}
              >
                <Text style={styles.currentBadgeText}>UPCOMING</Text>
              </LinearGradient>
            )}
          </View>
          
          <View style={styles.fairnessBadge}>
            <MaterialCommunityIcons 
              name={prediction.fairnessScore > 80 ? 'check-circle' : 'alert'} 
              size={14} 
              color={prediction.fairnessScore > 80 ? theme.primary : theme.primary} 
            />
            <Text style={[
              styles.fairnessText,
              { color: prediction.fairnessScore > 80 ? theme.primary : theme.primary }
            ]}>
              Fairness: {prediction.fairnessScore}%
            </Text>
          </View>
        </View>

        <View style={styles.fairnessExplanation}>
          <Text style={[styles.explanationText, { color: theme.textMuted }]}>
            ✅ Tasks rotate to the NEXT member EVERY WEEK
          </Text>
        </View>

        <View style={styles.assignmentsList}>
          {sortedAssignments.map((assignment, idx) => {
            const rankColor = getTaskRankColor(assignment.taskRank, totalTasks);
            const rankIcon = getTaskRankIcon(assignment.taskRank, totalTasks);
            
            return (
              <View key={`${assignment.memberId}-${assignment.taskId}`} style={styles.assignmentRow}>
                <View style={styles.memberContainer}>
                  <LinearGradient
                    colors={[theme.bgSecondary, theme.bgTertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.memberAvatar, { borderColor: theme.border }]}
                  >
                    <Text style={[styles.memberInitial, { color: theme.textSecondary }]}>
                      {assignment.memberName?.charAt(0) || '?'}
                    </Text>
                  </LinearGradient>
                  <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                    {assignment.memberName}
                  </Text>
                </View>

                <MaterialCommunityIcons name="arrow-right" size={16} color={theme.textMuted} />

                <View style={styles.taskContainer}>
                  <LinearGradient
                    colors={[rankColor + '20', rankColor + '10']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.taskBadge, { borderColor: rankColor }]}
                  >
                    <MaterialCommunityIcons 
                      name={rankIcon} 
                      size={12} 
                      color={rankColor} 
                    />
                    <Text style={[styles.taskTitle, { color: rankColor }]} numberOfLines={1}>
                      {assignment.taskTitle}
                    </Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={[theme.primaryLight, theme.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pointsBadge}
                  >
                    <Text style={[styles.pointsText, { color: theme.primary }]}>{assignment.taskPoints} pts</Text>
                  </LinearGradient>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.fairnessNote, { borderTopColor: theme.border }]}>
          <MaterialCommunityIcons 
            name="information" 
            size={14} 
            color={theme.textMuted} 
          />
          <Text style={[styles.noteText, { color: theme.textMuted }]}>
            {isFirst 
              ? `✓ Tasks move to the NEXT member EVERY WEEK`
              : `After ${rotationCycle} weeks (full cycle), every member has held EVERY task exactly once`}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  const renderCycleSummary = () => {
    if (predictions.length === 0) return null;
    
    const firstPrediction = predictions[0];
    const membersList = firstPrediction.assignments.map((a: any) => ({
      id: a.memberId,
      name: a.memberName
    }));
    
    const memberCount = membersList.length;
    
    return (
      <LinearGradient
        colors={[theme.card, theme.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cycleCard, { borderColor: theme.border }]}
      >
        <Text style={[styles.cycleTitle, { color: theme.primary }]}>🔄 Weekly Rotation Cycle</Text>
        <Text style={[styles.cycleDescription, { color: theme.textMuted }]}>
          Tasks rotate to the NEXT member EVERY WEEK • After {memberCount} weeks, each task returns to its original member
        </Text>
        
        <View style={styles.cycleGrid}>
          <View style={styles.cycleHeader}>
            <Text style={[styles.cycleHeaderText, { color: theme.textMuted }]}>Member</Text>
            <Text style={[styles.cycleHeaderText, { color: theme.textMuted }]}>Week 1</Text>
            <Text style={[styles.cycleHeaderText, { color: theme.textMuted }]}>Week 2</Text>
            <Text style={[styles.cycleHeaderText, { color: theme.textMuted }]}>Week 3</Text>
            <Text style={[styles.cycleHeaderText, { color: theme.textMuted }]}>Week 4</Text>
          </View>
          
          {membersList.slice(0, 4).map((member: any, idx: number) => (
            <View key={member.id} style={styles.cycleRow}>
              <Text style={[styles.cycleMemberName, { color: theme.text }]} numberOfLines={1}>
                {member.name.split(' ')[0]}
              </Text>
              {[0, 1, 2, 3].map(weekOffset => {
                const pred = predictions[weekOffset];
                if (!pred) return <View key={weekOffset} style={styles.cycleCell} />;
                
                const assignment = pred.assignments.find((a: any) => a.memberId === member.id);
                if (!assignment) return <View key={weekOffset} style={styles.cycleCell} />;
                
                const rankColor = getTaskRankColor(assignment.taskRank, rotationCycle);
                
                return (
                  <View key={weekOffset} style={styles.cycleCell}>
                    <LinearGradient
                      colors={[rankColor + '20', rankColor + '10']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.cycleRankBadge, { borderColor: rankColor }]}
                    >
                      <Text style={[styles.cycleRankText, { color: rankColor }]}>
                        #{assignment.taskRank}
                      </Text>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        
        <Text style={[styles.cycleNote, { color: theme.textMuted }]}>
          * Tasks rotate to the NEXT member each week • After {memberCount} weeks, every member has held every task
        </Text>
      </LinearGradient>
    );
  };

  // ✅ UPDATED: Week tab with badge OUTSIDE the button
  const renderWeekTab = (week: any) => {
    if (!week) return null;
    
    const isSelected = selectedWeek === week.weekNumber;
    const isCurrentWeek = currentWeek === week.weekNumber;
    const hasTasks = week.tasks && week.tasks.length > 0;
    const taskCount = week.tasks?.length || 0;

    return (
      <View key={week.weekNumber} style={styles.weekTabWrapper}>
        <TouchableOpacity
          style={[
            styles.weekTab,
            isSelected && styles.weekTabSelected,
            { borderColor: theme.border }
          ]}
          onPress={() => setSelectedWeek(week.weekNumber)}
        >
          <LinearGradient
            colors={isSelected ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.weekTabGradient}
          >
            <Text style={[
              styles.weekTabText,
              isSelected && styles.weekTabTextSelected,
              { color: isSelected ? '#fff' : theme.textSecondary }
            ]}>
              W{week.weekNumber}
            </Text>
            {isCurrentWeek && (
              <View style={styles.currentIndicator}>
                <MaterialCommunityIcons name="circle-small" size={8} color={theme.primary} />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {/* ✅ Badge OUTSIDE the button like notification count */}
        {hasTasks && (
          <LinearGradient
            colors={[theme.error, theme.error]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.taskCountBadge}
          >
            <Text style={styles.taskCountText}>{taskCount}</Text>
          </LinearGradient>
        )}
      </View>
    );
  };

  // ✅ Render single task item
  const renderTaskItem = (item: any, index: number) => {
    const isCurrentWeekTask = currentWeek === item.week;
    const totalTaskPoints = item.points || 0;
    
    const allTasksInWeek = getSelectedWeekTasks();
    const allPoints = allTasksInWeek.map((t: any) => t.points || 0).sort((a: number, b: number) => b - a);
    const rank = allPoints.indexOf(totalTaskPoints) + 1;
    const rankColor = getTaskRankColor(rank, allPoints.length);
    const rankIcon = getTaskRankIcon(rank, allPoints.length);
    
    const slotCount = item.timeSlots?.length || 0;
    const hasMultipleSlots = slotCount > 1;
    
    return (
      <TouchableOpacity
        key={`${item.taskId}-${item.week}-${index}`}
        style={[
          styles.taskCard,
          isCurrentWeekTask && styles.currentWeekTask,
          { borderColor: theme.border }
        ]}
        onPress={() => navigation.navigate('TaskDetails', { 
          taskId: item.taskId, 
          groupId, 
          userRole 
        })}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isCurrentWeekTask ? [theme.primaryLight, theme.primaryLight] : [theme.card, theme.bgSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.taskGradient}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <LinearGradient
                colors={[rankColor + '20', rankColor + '10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.rankBadge, { borderColor: rankColor }]}
              >
                <MaterialCommunityIcons name={rankIcon} size={10} color={rankColor} />
                <Text style={[styles.rankText, { color: rankColor }]}>
                  #{rank}
                </Text>
              </LinearGradient>
              <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
                {item.taskTitle}
              </Text>
            </View>
            
            <LinearGradient
              colors={[theme.primaryLight, theme.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsBadge}
            >
              <MaterialCommunityIcons name="star" size={12} color={theme.primary} />
              <Text style={[styles.pointsText, { color: theme.primary }]}>{totalTaskPoints} pts</Text>
            </LinearGradient>
          </View>
          
          {hasMultipleSlots && (
            <View style={styles.timeSlotBreakdown}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={theme.textMuted} />
              <Text style={[styles.timeSlotBreakdownText, { color: theme.textMuted }]}>
                {slotCount} slot{slotCount > 1 ? 's' : ''}: 
                {item.timeSlots.map((slot: any, idx: number) => (
                  <Text key={idx}>
                    {idx > 0 ? ', ' : ' '}
                    {slot.points || 0} pts
                  </Text>
                ))}
              </Text>
            </View>
          )}
          
          <View style={styles.taskDetails}>
            <View style={styles.assigneeContainer}>
              <MaterialCommunityIcons name="account" size={14} color={theme.textMuted} />
              <Text style={[styles.assigneeText, { color: theme.textMuted }]} numberOfLines={1}>
                {item.assigneeName || 'Unassigned'}
              </Text>
            </View>
            
            <View style={styles.timeContainer}>
              {item.dayOfWeek && (
                <>
                  <MaterialCommunityIcons name="calendar" size={12} color={theme.textMuted} />
                  <Text style={[styles.timeText, { color: theme.textMuted }]}>
                    {item.dayOfWeek}
                    {item.scheduledTime ? ` • ${item.scheduledTime}` : ''}
                  </Text>
                </>
              )}
            </View>
          </View>
          
          {item.category && (
            <View style={styles.categoryContainer}>
              <MaterialCommunityIcons name="tag" size={10} color={theme.textMuted} />
              <Text style={[styles.categoryText, { color: theme.textMuted }]}>{item.category}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading rotation schedule...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && isEmpty) {
    return (
      <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={64} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Failed to Load Schedule</Text>
          <Text style={[styles.errorSubText, { color: theme.textMuted }]}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadRotationSchedule}
          >
            <LinearGradient
              colors={[theme.primary, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

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
          <Text style={[styles.title, { color: theme.text }]}>Rotation Schedule</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{groupName}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={refresh}
          disabled={refreshing}
          style={[styles.refreshButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color={theme.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Week Tabs with Badges Outside */}
        {weeks.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.weeksScroll}
            contentContainerStyle={styles.weeksContainer}
          >
            {weeks.map(renderWeekTab)}
          </ScrollView>
        )}

        {/* Toggle between History and Predictions */}
        <View style={[styles.toggleContainer, { borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.toggleButton, !showPredictions && styles.toggleActive]}
            onPress={() => setShowPredictions(false)}
          >
            <LinearGradient
              colors={!showPredictions ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toggleGradient}
            >
              <Text style={[styles.toggleText, !showPredictions && styles.toggleTextActive, { color: !showPredictions ? '#fff' : theme.textSecondary }]}>
                📜 History
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toggleButton, showPredictions && styles.toggleActive]}
            onPress={() => setShowPredictions(true)}
          >
            <LinearGradient
              colors={showPredictions ? [theme.primary, theme.primaryDark] : [theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toggleGradient}
            >
              <Text style={[styles.toggleText, showPredictions && styles.toggleTextActive, { color: showPredictions ? '#fff' : theme.textSecondary }]}>
                🔮 Predictions
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {showPredictions ? (
          // PREDICTIONS VIEW
          <View style={styles.predictionsContainer}>
            {/* Cycle Summary */}
            {renderCycleSummary()}
            
            {/* Next Weeks Predictions */}
            <Text style={[styles.predictionsTitle, { color: theme.text }]}>📅 Upcoming Weeks</Text>
            {predictions.slice(0, 4).map((pred, idx) => renderPredictionWeek(pred, idx))}
            
            {/* Algorithm Explanation */}
            <LinearGradient
              colors={[theme.bgSecondary, theme.bgTertiary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.explanationCard, { borderColor: theme.border }]}
            >
              <Text style={[styles.explanationTitle, { color: theme.text }]}>⚖️ How Weekly Rotation Works</Text>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="numeric-1-circle" size={18} color={theme.primary} />
                <Text style={[styles.explanationPointText, { color: theme.textSecondary }]}>
                  Tasks rotate to the NEXT member EVERY WEEK
                </Text>
              </View>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="numeric-2-circle" size={18} color={theme.primary} />
                <Text style={[styles.explanationPointText, { color: theme.textSecondary }]}>
                  Each member gets a DIFFERENT task every week
                </Text>
              </View>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="numeric-3-circle" size={18} color={theme.primary} />
                <Text style={[styles.explanationPointText, { color: theme.textSecondary }]}>
                  After {rotationCycle} weeks (full cycle), every member has held EVERY task exactly once
                </Text>
              </View>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="check-circle" size={18} color={theme.primary} />
                <Text style={[styles.explanationPointText, { color: theme.textSecondary }]}>
                  ✓ Perfect fairness - each task is shared equally among all members
                </Text>
              </View>
            </LinearGradient>
          </View>
        ) : (
          // HISTORY VIEW
          <View>
            {/* Current Week Info */}
            {currentWeek === selectedWeek && (
              <LinearGradient
                colors={[theme.primaryLight, theme.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.currentWeekBanner, { borderColor: theme.primaryBorder }]}
              >
                <MaterialCommunityIcons name="information" size={18} color={theme.primary} />
                <Text style={[styles.currentWeekText, { color: theme.primary }]}>
                  Current week • Tasks are active and can be completed
                </Text>
              </LinearGradient>
            )}

            {/* Statistics */}
            {selectedWeekData && selectedWeekData.tasks.length > 0 && (
              <LinearGradient
                colors={[theme.card, theme.bgSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.statsCard, { borderColor: theme.border }]}
              >
                <Text style={[styles.statsTitle, { color: theme.text }]}>Week {selectedWeek} Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={[styles.statItem, { backgroundColor: theme.bgSecondary }]}>
                    <Text style={[styles.statNumber, { color: theme.primary }]}>{selectedWeekData.tasks.length}</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Tasks</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.bgSecondary }]}>
                    <Text style={[styles.statNumber, { color: theme.primary }]}>
                      {selectedWeekData.tasks.reduce((sum: number, t: any) => sum + (t.points || 0), 0)}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Points</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.bgSecondary }]}>
                    <Text style={[styles.statNumber, { color: theme.primary }]}>
                      {selectedWeekData.tasks.filter((t: any) => t.assigneeName && t.assigneeName !== 'Unassigned').length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Assigned</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: theme.bgSecondary }]}>
                    <Text style={[styles.statNumber, { color: theme.primary }]}>{calculateFairnessScore()}/100</Text>
                    <Text style={[styles.statLabel, { color: theme.textMuted }]}>Fairness</Text>
                  </View>
                </View>
              </LinearGradient>
            )}

            {/* Day Distribution */}
           {/* Day Distribution - Verified Tasks by Day */}
{selectedWeekData && selectedWeekData.tasks.length > 0 && (
  <LinearGradient
    colors={[theme.card, theme.bgSecondary]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.distributionCard, { borderColor: theme.border }]}
  >
    <Text style={[styles.distributionTitle, { color: theme.text }]}>
      ✅ Verified Tasks by Day ({selectedWeekData?.totalVerified || 0} total)
    </Text>
    <View style={styles.distributionGrid}>
      {Object.entries(getVerifiedDistributionByDay()).map(([day, count]: [string, any]) => {
        const maxCount = Math.max(...Object.values(getVerifiedDistributionByDay()), 1);
        return (
          <View key={day} style={styles.dayColumn}>
            <Text style={[styles.dayLabel, { color: theme.textMuted }]}>{day.substring(0, 3)}</Text>
            <View style={styles.dayBarContainer}>
              <View 
                style={[
                  styles.dayBar,
                  { 
                    height: (count / maxCount) * 40,
                    backgroundColor: count > 0 ? theme.primary : theme.bgTertiary
                  }
                ]} 
              />
            </View>
            <Text style={[styles.dayCount, { color: theme.textSecondary }]}>{count}</Text>
          </View>
        );
      })}
    </View>
  </LinearGradient>
)}

            {/* Tasks List */}
            <View style={styles.tasksSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Week {selectedWeek} Tasks
                </Text>
                <LinearGradient
                  colors={[theme.bgSecondary, theme.bgTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.taskCountBadgeHeader}
                >
                  <Text style={[styles.taskCountHeader, { color: theme.textSecondary }]}>
                    {getSelectedWeekTasks().length}
                  </Text>
                </LinearGradient>
              </View>

              {getSelectedWeekTasks().length > 0 ? (
                getSelectedWeekTasks().map((item: any, index: number) => renderTaskItem(item, index))
              ) : (
                <View style={styles.emptyTasks}>
                  <MaterialCommunityIcons name="calendar-blank" size={48} color={theme.border} />
                  <Text style={[styles.emptyTasksText, { color: theme.textMuted }]}>No tasks scheduled</Text>
                  <Text style={[styles.emptyTasksSubtext, { color: theme.textPlaceholder }]}>
                    {selectedWeek === currentWeek 
                      ? "Tasks will appear here once they're assigned"
                      : "No tasks were scheduled for this week"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}