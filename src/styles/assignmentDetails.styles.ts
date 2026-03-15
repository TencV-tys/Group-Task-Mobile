// src/styles/assignmentDetails.styles.ts
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const assignmentDetailsStyles = StyleSheet.create({
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    marginRight: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarText: {
    color: '#495057',
    fontSize: 18,
    fontWeight: '600'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2
  },
  completionDate: {
    fontSize: 12,
    color: '#868e96'
  },
  completeSection: {
    marginBottom: 16
  },
  submissionStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  submissionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    marginTop: 12,
    marginLeft: 52,
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
  urgentTimerBadge: {},
  lateTimerBadge: {},
  timerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  urgentMessage: {
    fontSize: 12,
    color: '#fa5252',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },
  waitingContainer: {
    marginTop: 12,
    marginLeft: 52,
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
    fontSize: 13,
    color: '#e67700',
    fontWeight: '600',
  },
  completeButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    padding: 14,
  },
  lateButton: {},
  completeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  completeButtonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  completeButtonSubtext: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButtonContainer: {
    marginTop: 8,
  },
  disabledButton: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  disabledButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  disabledButtonText: {
    color: '#868e96',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButtonHint: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  penaltyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffec99',
  },
  penaltyText: {
    fontSize: 12,
    color: '#e67700',
    fontWeight: '600'
  },
  timeWindowInfo: {
    marginTop: 12,
    marginLeft: 52,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeWindowText: {
    fontSize: 11,
    color: '#868e96',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  swapSection: {
    marginBottom: 24,
  },
  swapButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe4ff',
  },
  swapButtonGradient: {
    padding: 16,
  },
  swapButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  swapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  swapButtonSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 32,
  },
  pendingSwapButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingSwapGradient: {
    padding: 16,
  },
  pendingSwapText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
  },
  pendingSwapSubtext: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 32,
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
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e67700',
    marginLeft: 4
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden'
  },
  photo: {
    width: '100%',
    height: 220,
    backgroundColor: '#f8f9fa'
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    alignItems: 'center'
  },
  viewPhotoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2
  },
  notesCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0ebff',
  },
  notesText: {
    fontSize: 14,
    color: '#2b8a3e',
    lineHeight: 20
  },
  adminNotesCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectedNotes: {
    borderColor: '#ffc9c9',
  },
  verifiedNotes: {
    borderColor: '#b2f2bb',
  },
  adminNotesText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20
  },
  verificationSection: {
    marginBottom: 24
  },
  notesInputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  notesInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
  },
  charCount: {
    textAlign: 'right',
    color: '#868e96',
    fontSize: 11,
    marginBottom: 16
  },
  verificationButtons: {
    flexDirection: 'row',
    gap: 12
  },
  verifyButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  rejectButton: {},
  approveButton: {},
  verifyButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600'
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 13,
    color: '#495057'
  }
});