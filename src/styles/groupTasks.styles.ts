// src/styles/groupTasks.styles.ts
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    minHeight: 56,
    backgroundColor: 'white',
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
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 10,
    color: '#868e96',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 80,
    justifyContent: 'flex-end'
  },
  swapButton: {
    position: 'relative',
    padding: 8,
  },
  swapBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#fa5252',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  swapBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100
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
    overflow: 'hidden'
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 16
  },
  listContainer: {
    padding: 16,
    paddingBottom: 70
  },
  taskCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative'
  },
  activeTaskCard: {
    borderWidth: 2,
    borderColor: '#495057',
  },
  taskHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  taskInfo: {
    flex: 1,
    marginRight: 40
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    marginRight: 8,
    lineHeight: 22
  },
  completedTaskTitle: {
    color: '#868e96',
    textDecorationLine: 'line-through'
  },
  activeTaskTitle: {
    color: '#495057',
    fontWeight: '700'
  },
  editButton: {
    padding: 4
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc9c9'
  },
  taskDescription: {
    fontSize: 14,
    color: '#868e96',
    marginBottom: 10,
    lineHeight: 20
  },
  completedTaskDescription: {
    color: '#adb5bd'
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  taskPoints: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e67700'
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  taskCategory: {
    fontSize: 12,
    color: '#495057'
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    marginTop: 12
  },
  taskCreator: {
    fontSize: 12,
    color: '#868e96',
    flexDirection: 'row',
    alignItems: 'center'
  },
  taskDate: {
    fontSize: 12,
    color: '#868e96'
  },
  assignmentInfo: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  myAssignment: {
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    borderColor: '#ced4da'
  },
  unassignedInfo: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  unassignedText: {
    fontSize: 13,
    color: '#868e96',
    fontStyle: 'italic'
  },
  completedAssignment: {
    backgroundColor: 'rgba(211, 249, 216, 0.8)',
    borderColor: '#b2f2bb'
  },
  pendingAssignment: {
    backgroundColor: 'rgba(255, 243, 191, 0.8)',
    borderColor: '#ffd43b'
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  assignmentStatus: {
    fontSize: 14,
    fontWeight: '600'
  },
  assignmentDetails: {
    gap: 4
  },
  assignmentDetail: {
    fontSize: 12,
    color: '#495057'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#212529'
  },
  completeNowButton: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden'
  },
  completeNowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8
  },
  completeNowText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center'
  },
  timeLeftBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8
  },
  timeLeftText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  timeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6
  },
  timeLeftLabel: {
    fontSize: 13,
    color: '#e67700',
    fontWeight: '500'
  },
  expiredContainer: {
    borderWidth: 1,
    borderColor: '#fa5252'
  },
  expiredText: {
    color: '#fa5252'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    marginTop: 40
  },
  emptyText: {
    fontSize: 18,
    color: '#868e96',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  emptyButton: {
    borderRadius: 8,
    overflow: 'hidden'
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 100
  },
  floatingButton: {
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  assignButton: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  reviewButton: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  bottomTab: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 8,
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 50,
    backgroundColor: 'white',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 80,
    flex: 1,
    height: '100%'
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  tabText: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#2b8a3e', 
    fontWeight: '600' 
  },
  todaySection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  urgentSection: {
    borderColor: '#fa5252',
  },
  warningSection: {
    borderColor: '#e67700',
  },
  todaySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todaySectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todaySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  todaySectionViewAll: {
    fontSize: 14,
    color: '#2b8a3e',
    fontWeight: '600',
  },
  todayTaskItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  urgentTaskItem: {
    borderWidth: 2,
    borderColor: '#fa5252',
    backgroundColor: '#fff5f5',
  },
  lateTaskItem: {
    borderWidth: 2,
    borderColor: '#e67700',
    backgroundColor: '#fff3bf',
  },
  warningTaskItem: {
    borderWidth: 1,
    borderColor: '#ffd43b',
    backgroundColor: '#fff9db',
  },
  todayTaskItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayTaskItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentIcon: {
    backgroundColor: '#fa5252',
  },
  lateIcon: {
    backgroundColor: '#e67700',
  },
  warningIcon: {
    backgroundColor: '#e67700',
  },
  todayTaskItemInfo: {
    flex: 1,
  },
  todayTaskItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  todayTaskItemTime: {
    fontSize: 12,
    color: '#868e96',
  },
  urgentTime: {
    color: '#fa5252',
    fontWeight: '600',
  },
  lateTime: {
    color: '#e67700',
    fontWeight: '600',
  },
  warningTime: {
    color: '#e67700',
    fontWeight: '600',
  },
  todayMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  todayMoreButtonText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: '600',
  },
  todayFAB: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    overflow: 'hidden'
  },
  todayFABContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  todayFABTextContainer: {
    flex: 1,
  },
  todayFABTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  todayFABCount: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  activeBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#495057',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  urgentBadge: {
    backgroundColor: '#fa5252',
  },
  lateBadge: {
    backgroundColor: '#e67700',
  },
  warningBadge: {
    backgroundColor: '#e67700',
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  activeStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600'
  },
  activeTaskButton: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  activeTaskButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16
  },
  activeTaskButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center'
  },
  rotationWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#ffec99',
  },
  rotationWarningText: {
    fontSize: 10,
    color: '#e67700',
    fontWeight: '600',
  },
  rotationBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rotationBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rotationBannerText: {
    flex: 1,
  },
  rotationBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e67700',
    marginBottom: 2,
  },
  rotationBannerMessage: {
    fontSize: 13,
    color: '#e67700',
    lineHeight: 18,
  },
  warningTitle: {
    color: '#e67700',
  },
  warningMessage: {
    color: '#e67700',
  },
  successTitle: {
    color: '#2b8a3e',
  },
  successMessage: {
    color: '#2b8a3e',
  },
  creationDayBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#868e96',
  },
  bannerStats: {
    gap: 8,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  successText: {
    color: '#2b8a3e',
  },
  warningText: {
    color: '#e67700',
  },
  tasksNeededBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3bf',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffec99',
  },
  tasksNeededText: {
    fontSize: 13,
    color: '#e67700',
    fontWeight: '600',
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3bf',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffec99',
  },
  warningBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#e67700',
    lineHeight: 18,
  },
});