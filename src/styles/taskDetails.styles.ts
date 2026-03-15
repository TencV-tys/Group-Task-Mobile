// src/styles/taskDetails.styles.ts
import { StyleSheet } from 'react-native';

export const taskDetailsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center'
  },
  editButton: {
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
  headerSpacer: {
    width: 36
  }, 
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80
  },
  loadingText: {
    marginTop: 12,
    color: '#868e96',
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#fa5252',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    marginTop: 12
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
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 16,
    color: '#868e96',
    marginTop: 16,
    textAlign: 'center'
  },
  content: {
    flex: 1,
    padding: 16
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  taskTitleContainer: {
    flex: 1
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 6
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 4
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529'
  },
  description: {
    fontSize: 14,
    color: '#868e96',
    lineHeight: 20
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24
  },
  detailItem: {
    width: '48%'
  },
  detailLabel: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529'
  },
  weekInfoCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8
  },
  weekInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  weekInfoLabel: {
    fontSize: 13,
    color: '#868e96',
    width: 45
  },
  weekInfoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#212529',
    flex: 1
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  todayDayChip: {
    borderColor: '#2b8a3e',
  },
  dayText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500'
  },
  todayDayText: {
    color: '#2b8a3e',
    fontWeight: '700'
  },
  todayDayLabel: {
    fontSize: 9,
    color: '#2b8a3e',
    fontWeight: '600',
    backgroundColor: '#fff',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2
  },
  timeSlotsContainer: {
    gap: 8
  },
  timeSlotCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentTimeSlotCard: {
    borderColor: '#b2f2bb',
    borderWidth: 2,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  timeSlotTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529',
    flex: 1
  },
  currentTimeSlotTime: {
    color: '#2b8a3e',
    fontWeight: '600'
  },
  slotPointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  slotPointsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700'
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#868e96',
    marginLeft: 26,
    marginBottom: 2
  },
  activeSlotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d3f9d8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4
  },
  activeSlotText: {
    fontSize: 11,
    color: '#2b8a3e',
    fontWeight: '500'
  },
  timeSlotNote: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic',
    marginTop: 6
  },
  assignmentCard: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  assignmentInfo: {
    flex: 1
  },
  assignmentDate: {
    fontSize: 13,
    color: '#495057'
  },
  submissionStatusCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
  },
  submissionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  submissionStatusLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  submissionStatusDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  timerContainer: {
    marginTop: 10,
    marginLeft: 50,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentTimerBadge: {},
  urgentMessage: {
    fontSize: 11,
    color: '#fa5252',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  waitingContainer: {
    marginTop: 10,
    marginLeft: 50,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 4,
  },
  waitingText: {
    fontSize: 12,
    color: '#e67700',
    fontWeight: '600',
  },
  notAssignedCard: {
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    gap: 10
  },
  notAssignedText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center'
  },
  notAssignedSubtext: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 4
  },
  submissionHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative'
  },
  todaySubmissionCard: {
    borderColor: '#2b8a3e',
    borderWidth: 2,
  },
  todayBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
    zIndex: 1
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600'
  },
  submissionHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6
  },
  statusIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  submissionHistoryInfo: {
    flex: 1
  },
  submissionHistoryStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  submissionHistoryDate: {
    fontSize: 11,
    color: '#868e96'
  },
  todayText: {
    color: '#fa5252',
    fontWeight: '600'
  },
  submittedDate: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 6,
    marginLeft: 38
  },
  submissionHistoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 38,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  hasPhotoBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4
  },
  hasPhotoTextSmall: {
    fontSize: 10,
    color: '#2b8a3e'
  },
  hasNotesBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4
  },
  hasNotesTextSmall: {
    fontSize: 10,
    color: '#e67700'
  },
  pointsEarned: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 'auto'
  },
  adminFeedbackPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
    marginLeft: 38,
    gap: 4
  },
  adminFeedbackPreviewText: {
    fontSize: 10,
    color: '#fa5252',
    flex: 1,
    fontStyle: 'italic'
  },
  upcomingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    position: 'relative'
  },
  todayUpcomingCard: {
    borderColor: '#e67700',
    borderWidth: 2,
  },
  upcomingTodayBadge: {
    position: 'absolute',
    top: -6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1
  },
  upcomingTodayBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600'
  },
  upcomingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  upcomingUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  upcomingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  upcomingAvatarText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: 'bold'
  },
  upcomingUserDetails: {
    flex: 1
  },
  upcomingUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 1
  },
  upcomingTaskName: {
    fontSize: 11,
    color: '#868e96'
  },
  upcomingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4
  },
  upcomingStatusText: {
    fontSize: 9,
    fontWeight: '600'
  },
  upcomingDetails: {
    gap: 4,
    marginLeft: 34
  },
  upcomingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  upcomingDetailText: {
    fontSize: 11,
    color: '#868e96'
  },
  adminInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  adminInfoContent: {
    flex: 1
  },
  adminInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 2
  },
  adminInfoText: {
    fontSize: 12,
    color: '#2b8a3e',
    lineHeight: 16
  },
  assigneeInfo: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  assigneeLabel: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 2
  },
  assigneeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212529'
  },
  rotationInfo: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  rotationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8
  },
  rotationMembersList: {
    gap: 6
  },
  rotationMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  rotationMemberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentAssigneeAvatar: {
    borderColor: '#2b8a3e',
  },
  rotationMemberInitial: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  rotationMemberName: {
    fontSize: 13,
    color: '#495057'
  },
  currentAssigneeName: {
    fontWeight: '600',
    color: '#2b8a3e'
  },
  assignmentsContainer: {
    gap: 8
  },
  assignmentsSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4
  },
  adminAssignmentCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 6,
    position: 'relative'
  },
  todayAdminCard: {
    borderColor: '#2b8a3e',
    borderWidth: 2,
  },
  todayAdminBadge: {
    position: 'absolute',
    top: -6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    zIndex: 1
  },
  todayAdminBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600'
  },
  adminAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  userAvatarText: {
    color: '#495057',
    fontSize: 12,
    fontWeight: 'bold'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529'
  },
  assignmentDateSmall: {
    fontSize: 11,
    color: '#868e96'
  },
  todaySmallText: {
    color: '#fa5252',
    fontWeight: '600'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    maxWidth: 80,
    flexShrink: 1
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
    flexShrink: 1
  },
  adminAssignmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap'
  },
  completedText: {
    fontSize: 11,
    color: '#868e96'
  },
  hasPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2
  },
  hasPhotoText: {
    fontSize: 8,
    color: '#2b8a3e'
  },
  hasNotesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2
  },
  hasNotesText: {
    fontSize: 8,
    color: '#e67700'
  },
  adminNotesPreview: {
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  adminNotesPreviewText: {
    fontSize: 10,
    color: '#868e96',
    fontStyle: 'italic'
  },
  moreAssignments: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic'
  },
  noAssignments: {
    fontSize: 12,
    color: '#868e96',
    fontStyle: 'italic'
  },
  memberInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  memberInfoText: {
    fontSize: 12,
    color: '#868e96',
    flex: 1
  },
  deleteButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 16,
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fa5252'
  },
  todayAssignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4
  },
  todayAssignmentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  todayAssignmentTitle: {
    color: '#fa5252',
    fontSize: 15,
    fontWeight: '600'
  },
  completedInfoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  completedInfoText: {
    flex: 1
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 1
  },
  completedDate: {
    fontSize: 11,
    color: '#2b8a3e'
  },
  viewDetailsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 4
  },
  viewDetailsText: {
    fontSize: 11,
    color: '#495057'
  },
  todayAssignmentCard: {
    borderWidth: 2,
    borderColor: '#fa5252',
  },
  overdueBadge: {
    backgroundColor: '#fa5252',
  },
  completedBadge: {
    backgroundColor: '#2b8a3e',
  },
  overdueCard: {
    borderWidth: 2,
    borderColor: '#fa5252',
  },
  completedCard: {
    borderWidth: 2,
    borderColor: '#2b8a3e',
  },
  overdueInfoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  overdueInfoText: {
    flex: 1,
  },
  overdueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fa5252',
    marginBottom: 1,
  },
  overdueDate: {
    fontSize: 11,
    color: '#fa5252',
  },
  neglectedText: {
    fontSize: 10,
    color: '#fa5252',
    fontStyle: 'italic',
    marginTop: 2,
  },
  lateText: {
    fontSize: 10,
    color: '#e67700',
    fontStyle: 'italic',
    marginTop: 2,
  },
});