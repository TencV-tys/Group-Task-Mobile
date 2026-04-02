// src/styles/createTask.styles.ts
import { StyleSheet } from 'react-native';

export const createTaskStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // ─── Header ───────────────────────────────────────────────────────────────
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // ─── Scroll / Content ─────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // ─── Banners ──────────────────────────────────────────────────────────────
  groupInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  groupInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 12,
    color: '#2b8a3e',
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  groupNote: {
    fontSize: 12,
    color: '#495057',
    fontStyle: 'italic',
    marginLeft: 24,
  },
  warningContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffec99',
  },
  infoContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#b2f2bb',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e67700',
    marginBottom: 2,
  },
  warningMessage: {
    fontSize: 13,
    color: '#e67700',
    lineHeight: 18,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2b8a3e',
    marginBottom: 2,
  },
  infoMessage: {
    fontSize: 13,
    color: '#2b8a3e',
    lineHeight: 18,
  },

  // ─── Form Section ─────────────────────────────────────────────────────────
  formSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  // ─── Inputs ───────────────────────────────────────────────────────────────
  inputGradient: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputErrorGradient: {
    borderColor: '#fa5252',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212529',
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  textAreaGradient: {
    minHeight: 100,
  },
  helperText: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 4,
    marginLeft: 2,
  },
  errorText: {
    color: '#fa5252',
    fontSize: 12,
    marginTop: 2,
  },

  // ─── Points ───────────────────────────────────────────────────────────────
  pointsLimitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsLimitText: {
    fontSize: 11,
    color: '#fa5252',
    fontWeight: '600',
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsInputGradient: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  pointsInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#495057',
    width: 50,
  },
  pointsUsageContainer: {
    marginBottom: 20,
  },
  pointsUsageBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#e9ecef',
    marginBottom: 8,
  },
  pointsUsageFill: {
    height: '100%',
    backgroundColor: '#2b8a3e',
    borderRadius: 4,
  },
  pointsUsageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsUsageText: {
    fontSize: 12,
    color: '#495057',
  },
  pointsUsageFull: {
    color: '#2b8a3e',
    fontWeight: '600',
  },
  pointsRemainingText: {
    fontSize: 12,
    color: '#2b8a3e',
    fontWeight: '500',
  },
  pointsFullText: {
    fontSize: 12,
    color: '#2b8a3e',
    fontWeight: '600',
  },

  // ─── Category Chips ───────────────────────────────────────────────────────
  categoryChipsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  categoryChipActive: {
    borderColor: '#2b8a3e',
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057',
  },
  categoryChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },

  // ─── Frequency ────────────────────────────────────────────────────────────
  frequencyContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  frequencyButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    borderColor: '#2b8a3e',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  frequencyButtonTextActive: {
    color: 'white',
  },

  // ─── Time Slots ───────────────────────────────────────────────────────────
  timeSlotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSlotsTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  timeSlotsSubtitle: {
    fontSize: 11,
    color: '#868e96',
    marginTop: 2,
  },
  addTimeSlotButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  addTimeSlotDisabled: {
    opacity: 0.6,
  },
  addTimeSlotGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  addTimeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  addTimeSlotTextDisabled: {
    color: '#868e96',
  },
  emptyTimeSlots: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  emptyTimeSlotsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#868e96',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyTimeSlotsSubtext: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
  },
  timeSlotsList: {
    gap: 8,
  },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  timeSlotItemError: {
    borderColor: '#fa5252',
  },
  timeSlotInfo: {
    flex: 1,
    marginRight: 8,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeSlotTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  timeSlotLabel: {
    fontSize: 12,
    color: '#868e96',
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pointsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2b8a3e',
  },
  pointsBadgeErrorText: {
    color: '#fa5252',
  },
  timeSlotActions: {
    flexDirection: 'row',
    gap: 6,
  },
  timeSlotActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },
  limitWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#fa5252',
  },

  // ─── Days ─────────────────────────────────────────────────────────────────
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dayButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    borderColor: '#2b8a3e',
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#495057',
  },
  dayButtonTextActive: {
    color: 'white',
  },

  // ─── Toggle ───────────────────────────────────────────────────────────────
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e9ecef',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#2b8a3e',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 22 }],
  },

  // ─── Error Box ────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc9c9',
  },

  // ─── Action Buttons ───────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  draftButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  draftButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  submitButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  submitButtonTextDisabled: {
    color: '#868e96',
  },
  buttonDisabled: {
    opacity: 0.7,
  },

  // ─── Info Box ─────────────────────────────────────────────────────────────
  infoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 18,
    flex: 1,
  },

  // ─── Confirmation Modal ───────────────────────────────────────────────────
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmModalCancelButton: {
    backgroundColor: '#e9ecef',
  },
  confirmModalConfirmButton: {
    // background set by LinearGradient
  },
  confirmModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  confirmModalConfirmButtonText: {
    color: 'white',
  },
});