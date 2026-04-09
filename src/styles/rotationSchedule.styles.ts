// src/styles/rotationSchedule.styles.ts - UPDATED with proper badge positioning

import { StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const makeRotationScheduleStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  timeSlotBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  timeSlotBreakdownText: {
    fontSize: 11,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  weeksScroll: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  weekTabWrapper: {
    position: 'relative',
  },
  weekTab: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    minWidth: 60,
  },
  weekTabGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekTabSelected: {
    borderWidth: 2,
  },
  weekTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekTabTextSelected: {},
  currentIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  // ✅ FIXED: Badge outside the button like notification count
  taskCountBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  taskCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  toggleButton: {
    flex: 1,
  },
  toggleGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {},
  toggleActive: {
    borderWidth: 1,
  },
  predictionsContainer: {
    paddingHorizontal: 16,
  },
  predictionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  predictionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  nextWeekCard: {
    borderWidth: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predictionWeek: {
    fontSize: 15,
    fontWeight: '700',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  fairnessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fairnessText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fairnessExplanation: {
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  assignmentsList: {
    gap: 10,
    marginBottom: 12,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 100,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  memberInitial: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  taskContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  taskTitle: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  pointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fairnessNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  noteText: {
    fontSize: 11,
    flex: 1,
  },
  cycleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cycleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cycleDescription: {
    fontSize: 12,
    marginBottom: 16,
  },
  cycleGrid: {
    marginBottom: 12,
  },
  cycleHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  cycleHeaderText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  cycleMemberName: {
    width: 60,
    fontSize: 11,
    fontWeight: '500',
  },
  cycleCell: {
    flex: 1,
    alignItems: 'center',
  },
  cycleRankBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  cycleRankText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cycleNote: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  explanationCard: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  explanationPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  explanationPointText: {
    flex: 1,
    fontSize: 13,
  },
  currentWeekBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  currentWeekText: {
    flex: 1,
    fontSize: 13,
  },
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  distributionCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  distributionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  distributionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    width: (width - 64) / 7,
  },
  dayLabel: {
    fontSize: 10,
    marginBottom: 8,
  },
  dayBarContainer: {
    height: 40,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  dayBar: {
    width: 6,
    borderRadius: 3,
  },
  dayCount: {
    fontSize: 9,
    fontWeight: '600',
  },
  tasksSection: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  taskCountBadgeHeader: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  taskCountHeader: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  taskGradient: {
    padding: 14,
  },
  currentWeekTask: {
    borderWidth: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  rankText: {
    fontSize: 9,
    fontWeight: '700',
  },
  taskDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  assigneeText: {
    fontSize: 13,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  categoryText: {
    fontSize: 11,
  },
  emptyTasks: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  emptyTasksText: {
    fontSize: 15,
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  emptyTasksSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
});