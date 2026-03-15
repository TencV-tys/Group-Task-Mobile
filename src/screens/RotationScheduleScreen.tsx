// src/screens/RotationScheduleScreen.tsx - REFACTORED with separated styles
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
import { rotationScheduleStyles as styles } from '../styles/rotationSchedule.styles';

export default function RotationScheduleScreen({ route, navigation }: any) {
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
  const [rotationCycle, setRotationCycle] = useState<number>(6);

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

  const generatePredictions = (memberList: any[], taskList: any[]) => {
    if (memberList.length === 0 || taskList.length === 0) return;
    
    const memberCount = memberList.length;
    const taskCount = taskList.length;
    
    const sortedTasks = [...taskList].sort((a, b) => b.points - a.points);
    const sortedMembers = [...memberList].sort((a, b) => a.name.localeCompare(b.name));
    
    const preds = [];
    
    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekNumber = currentWeek + weekOffset + 1;
      const assignments = [];
      
      for (let i = 0; i < sortedMembers.length; i++) {
        const memberIndex = i;
        const taskIndex = (memberIndex + weekOffset) % taskCount;
        
        assignments.push({
          memberId: sortedMembers[memberIndex].id,
          memberName: sortedMembers[memberIndex].name,
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
      const fairnessScore = Math.round(100 - ((maxPoints - minPoints) / maxPoints) * 100);
      
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
    if (rank === 1) return '#fa5252';
    if (rank === total) return '#2b8a3e';
    if (rank <= Math.ceil(total / 3)) return '#e67700';
    if (rank >= total - Math.floor(total / 3)) return '#2b8a3e';
    return '#495057';
  };

  const getTaskRankIcon = (rank: number, total: number) => {
    if (rank === 1) return 'trophy';
    if (rank === total) return 'thumb-up';
    if (rank <= Math.ceil(total / 3)) return 'trending-up';
    if (rank >= total - Math.floor(total / 3)) return 'trending-down';
    return 'swap-horizontal';
  };

  const renderPredictionWeek = (prediction: any, index: number) => {
    if (!prediction) return null;
    
    const isFirst = index === 0;
    const totalTasks = prediction.assignments.length;
    
    const sortedAssignments = [...prediction.assignments].sort((a, b) => b.taskPoints - a.taskPoints);
    
    return (
      <LinearGradient
        key={prediction.weekNumber}
        colors={isFirst ? ['#e7f5ff', '#d0ebff'] : ['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.predictionCard, isFirst && styles.nextWeekCard]}
      >
        <View style={styles.predictionHeader}>
          <View style={styles.weekTitleContainer}>
            <Text style={styles.predictionWeek}>
              {isFirst ? '🔮 NEXT WEEK' : `Week ${prediction.weekNumber}`}
            </Text>
            {isFirst && (
              <LinearGradient
                colors={['#2b8a3e', '#1e6b2c']}
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
              color={prediction.fairnessScore > 80 ? '#2b8a3e' : '#e67700'} 
            />
            <Text style={[
              styles.fairnessText,
              { color: prediction.fairnessScore > 80 ? '#2b8a3e' : '#e67700' }
            ]}>
              Fairness: {prediction.fairnessScore}%
            </Text>
          </View>
        </View>

        <View style={styles.fairnessExplanation}>
          <Text style={styles.explanationText}>
            Lowest points member gets highest task • Rotates every {rotationCycle} weeks
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
                    colors={['#f8f9fa', '#e9ecef']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.memberAvatar}
                  >
                    <Text style={styles.memberInitial}>
                      {assignment.memberName?.charAt(0) || '?'}
                    </Text>
                  </LinearGradient>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {assignment.memberName}
                  </Text>
                </View>

                <MaterialCommunityIcons name="arrow-right" size={16} color="#adb5bd" />

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
                    colors={['#fff3bf', '#ffec99']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.pointsBadge}
                  >
                    <Text style={styles.pointsText}>{assignment.taskPoints} pts</Text>
                  </LinearGradient>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.fairnessNote}>
          <MaterialCommunityIcons 
            name="information" 
            size={14} 
            color="#868e96" 
          />
          <Text style={styles.noteText}>
            {isFirst 
              ? `✓ Member with lowest points gets highest task (${prediction.assignments.find((a: any) => a.taskRank === 1)?.memberName})`
              : `Cycle repeats every ${rotationCycle} weeks for perfect fairness`}
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
    
    return (
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cycleCard}
      >
        <Text style={styles.cycleTitle}>🔄 {rotationCycle}-Week Rotation Cycle</Text>
        <Text style={styles.cycleDescription}>
          Every member gets each task exactly once every {rotationCycle} weeks
        </Text>
        
        <View style={styles.cycleGrid}>
          <View style={styles.cycleHeader}>
            <Text style={styles.cycleHeaderText}>Member</Text>
            <Text style={styles.cycleHeaderText}>Week 1</Text>
            <Text style={styles.cycleHeaderText}>Week 2</Text>
            <Text style={styles.cycleHeaderText}>Week 3</Text>
            <Text style={styles.cycleHeaderText}>Week 4</Text>
          </View>
          
          {membersList.slice(0, 4).map((member: any, idx: number) => (
            <View key={member.id} style={styles.cycleRow}>
              <Text style={styles.cycleMemberName} numberOfLines={1}>
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
        
        <Text style={styles.cycleNote}>
          * #1 = Highest points • #{rotationCycle} = Lowest points
        </Text>
      </LinearGradient>
    );
  };

  const renderWeekTab = (week: any) => {
    if (!week) return null;
    
    const isSelected = selectedWeek === week.weekNumber;
    const isCurrentWeek = currentWeek === week.weekNumber;
    const hasTasks = week.tasks && week.tasks.length > 0;

    return (
      <TouchableOpacity
        key={week.weekNumber}
        style={[
          styles.weekTab,
          isSelected && styles.weekTabSelected,
        ]}
        onPress={() => setSelectedWeek(week.weekNumber)}
      >
        <LinearGradient
          colors={isSelected ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weekTabGradient}
        >
          <Text style={[
            styles.weekTabText,
            isSelected && styles.weekTabTextSelected
          ]}>
            W{week.weekNumber}
          </Text>
          {isCurrentWeek && (
            <View style={styles.currentIndicator}>
              <MaterialCommunityIcons name="circle-small" size={8} color="#2b8a3e" />
            </View>
          )}
          {hasTasks && (
            <LinearGradient
              colors={['#fa5252', '#e03131']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskIndicator}
            >
              <Text style={styles.taskIndicatorText}>{week.tasks.length}</Text>
            </LinearGradient>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
          <Text style={styles.loadingText}>Loading rotation schedule...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error && isEmpty) {
    return (
      <ScreenWrapper style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={64} color="#fa5252" />
          <Text style={styles.errorText}>Failed to Load Schedule</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadRotationSchedule}
          >
            <LinearGradient
              colors={['#2b8a3e', '#1e6b2c']}
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
          <Text style={styles.title}>Rotation Schedule</Text>
          <Text style={styles.subtitle}>{groupName}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={refresh}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#2b8a3e" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color="#495057" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refresh}
            colors={['#2b8a3e']}
            tintColor="#2b8a3e"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Week Tabs */}
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
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !showPredictions && styles.toggleActive]}
            onPress={() => setShowPredictions(false)}
          >
            <LinearGradient
              colors={!showPredictions ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toggleGradient}
            >
              <Text style={[styles.toggleText, !showPredictions && styles.toggleTextActive]}>
                📜 History
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toggleButton, showPredictions && styles.toggleActive]}
            onPress={() => setShowPredictions(true)}
          >
            <LinearGradient
              colors={showPredictions ? ['#2b8a3e', '#1e6b2c'] : ['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toggleGradient}
            >
              <Text style={[styles.toggleText, showPredictions && styles.toggleTextActive]}>
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
            <Text style={styles.predictionsTitle}>📅 Upcoming Weeks</Text>
            {predictions.slice(0, 4).map((pred, idx) => renderPredictionWeek(pred, idx))}
            
            {/* Algorithm Explanation */}
            <LinearGradient
              colors={['#f8f9fa', '#e9ecef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.explanationCard}
            >
              <Text style={styles.explanationTitle}>⚖️ How Fairness Works</Text>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="numeric-1-circle" size={18} color="#2b8a3e" />
                <Text style={styles.explanationPointText}>
                  Tasks are ranked by points (Highest #1 to Lowest #{rotationCycle})
                </Text>
              </View>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="numeric-2-circle" size={18} color="#2b8a3e" />
                <Text style={styles.explanationPointText}>
                  Members rotate through tasks in a cycle
                </Text>
              </View>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="numeric-3-circle" size={18} color="#2b8a3e" />
                <Text style={styles.explanationPointText}>
                  Over {rotationCycle} weeks, EVERY member gets EVERY task exactly once
                </Text>
              </View>
              <View style={styles.explanationPoint}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#2b8a3e" />
                <Text style={styles.explanationPointText}>
                  ✓ Perfect fairness - total points equal for all members after {rotationCycle} weeks
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
                colors={['#e7f5ff', '#d0ebff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.currentWeekBanner}
              >
                <MaterialCommunityIcons name="information" size={18} color="#2b8a3e" />
                <Text style={styles.currentWeekText}>
                  Current week • Tasks are active and can be completed
                </Text>
              </LinearGradient>
            )}

            {/* Statistics */}
            {selectedWeekData && selectedWeekData.tasks.length > 0 && (
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsCard}
              >
                <Text style={styles.statsTitle}>Week {selectedWeek} Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{selectedWeekData.tasks.length}</Text>
                    <Text style={styles.statLabel}>Tasks</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {selectedWeekData.tasks.reduce((sum: number, t: any) => sum + (t.points || 0), 0)}
                    </Text>
                    <Text style={styles.statLabel}>Total Points</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {selectedWeekData.tasks.filter((t: any) => t.assigneeName && t.assigneeName !== 'Unassigned').length}
                    </Text>
                    <Text style={styles.statLabel}>Assigned</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{calculateFairnessScore()}/100</Text>
                    <Text style={styles.statLabel}>Fairness</Text>
                  </View>
                </View>
              </LinearGradient>
            )}

            {/* Day Distribution */}
            {selectedWeekData && selectedWeekData.tasks.length > 0 && (
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.distributionCard}
              >
                <Text style={styles.distributionTitle}>Tasks by Day</Text>
                <View style={styles.distributionGrid}>
                  {Object.entries(getTaskDistributionByDay()).map(([day, count]: [string, any]) => (
                    <View key={day} style={styles.dayColumn}>
                      <Text style={styles.dayLabel}>{day.substring(0, 3)}</Text>
                      <View style={styles.dayBarContainer}>
                        <View 
                          style={[
                            styles.dayBar,
                            { 
                              height: (count / Math.max(...Object.values(getTaskDistributionByDay()), 1)) * 40,
                              backgroundColor: count > 0 ? '#2b8a3e' : '#e9ecef'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.dayCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            )}

            {/* Tasks List */}
            <View style={styles.tasksSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Week {selectedWeek} Tasks
                </Text>
                <LinearGradient
                  colors={['#f8f9fa', '#e9ecef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.taskCountBadge}
                >
                  <Text style={styles.taskCount}>
                    {getSelectedWeekTasks().length}
                  </Text>
                </LinearGradient>
              </View>

              {getSelectedWeekTasks().length > 0 ? (
                getSelectedWeekTasks().map((item: any, index: number) => {
                  const isCurrentWeek = currentWeek === item.week;
                  const taskPoints = item.points || 0;
                  
                  const allPoints = getSelectedWeekTasks().map((t: any) => t.points || 0).sort((a: number, b: number) => b - a);
                  const rank = allPoints.indexOf(taskPoints) + 1;
                  const rankColor = getTaskRankColor(rank, allPoints.length);
                  
                  return (
                    <TouchableOpacity
                      key={`${item.taskId}-${item.week}-${index}`}
                      style={[
                        styles.taskCard,
                        isCurrentWeek && styles.currentWeekTask
                      ]}
                      onPress={() => navigation.navigate('TaskDetails', { 
                        taskId: item.taskId, 
                        groupId, 
                        userRole 
                      })}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={isCurrentWeek ? ['#e7f5ff', '#d0ebff'] : ['#ffffff', '#f8f9fa']}
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
                              <Text style={[styles.rankText, { color: rankColor }]}>
                                #{rank}
                              </Text>
                            </LinearGradient>
                            <Text style={styles.taskTitle} numberOfLines={2}>
                              {item.taskTitle}
                            </Text>
                          </View>
                          <LinearGradient
                            colors={['#fff3bf', '#ffec99']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.pointsBadge}
                          >
                            <Text style={styles.pointsText}>{taskPoints} pts</Text>
                          </LinearGradient>
                        </View>
                        
                        <View style={styles.taskDetails}>
                          <View style={styles.assigneeContainer}>
                            <MaterialCommunityIcons name="account" size={14} color="#868e96" />
                            <Text style={styles.assigneeText} numberOfLines={1}>
                              {item.assigneeName || 'Unassigned'}
                            </Text>
                          </View>
                          
                          <View style={styles.timeContainer}>
                            {item.dayOfWeek && (
                              <>
                                <MaterialCommunityIcons name="calendar" size={12} color="#868e96" />
                                <Text style={styles.timeText}>
                                  {item.dayOfWeek}
                                  {item.scheduledTime ? ` • ${item.scheduledTime}` : ''}
                                </Text>
                              </>
                            )}
                          </View>
                        </View>
                        
                        {item.category && (
                          <View style={styles.categoryContainer}>
                            <MaterialCommunityIcons name="tag" size={10} color="#868e96" />
                            <Text style={styles.categoryText}>{item.category}</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyTasks}>
                  <MaterialCommunityIcons name="calendar-blank" size={48} color="#dee2e6" />
                  <Text style={styles.emptyTasksText}>No tasks scheduled</Text>
                  <Text style={styles.emptyTasksSubtext}>
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